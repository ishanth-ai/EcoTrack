import type { CleanupActivity, WasteReport } from "../types/plasticwatch";

const DB_NAME = "plasticwatch_local_db";
const DB_VERSION = 1;
const STORE_REPORTS = "reports";
const STORE_CLEANUPS = "cleanups";
const STORE_META = "meta";

const LS_REPORTS_KEY = "plasticwatch_reports_v1";
const LS_CLEANUPS_KEY = "plasticwatch_cleanups_v1";
const LS_RADIUS_KEY = "plasticwatch_radius_v1";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB raw limit

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_REPORTS)) {
        db.createObjectStore(STORE_REPORTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_CLEANUPS)) {
        db.createObjectStore(STORE_CLEANUPS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

async function readStoreAll<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function replaceStoreAll<T>(storeName: string, items: T[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.clear();
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadPersistedState(): Promise<{
  reports: WasteReport[];
  cleanups: CleanupActivity[];
  clusterRadiusMeters: number;
  storageBackend: "IndexedDB" | "localStorage";
}> {
  const savedRadiusRaw = window.localStorage.getItem(LS_RADIUS_KEY);
  const parsedRadius = savedRadiusRaw ? Number(savedRadiusRaw) : 50;
  const clusterRadiusMeters =
    Number.isFinite(parsedRadius) && parsedRadius >= 10 && parsedRadius <= 500 ? parsedRadius : 50;

  try {
    const [reports, cleanups] = await Promise.all([
      readStoreAll<WasteReport>(STORE_REPORTS),
      readStoreAll<CleanupActivity>(STORE_CLEANUPS),
    ]);
    return {
      reports: reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      cleanups: cleanups.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      clusterRadiusMeters,
      storageBackend: "IndexedDB",
    };
  } catch {
    try {
      const rRaw = window.localStorage.getItem(LS_REPORTS_KEY);
      const cRaw = window.localStorage.getItem(LS_CLEANUPS_KEY);
      const reports = rRaw ? (JSON.parse(rRaw) as WasteReport[]) : [];
      const cleanups = cRaw ? (JSON.parse(cRaw) as CleanupActivity[]) : [];
      return {
        reports: reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        cleanups: cleanups.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        clusterRadiusMeters,
        storageBackend: "localStorage",
      };
    } catch {
      return {
        reports: [],
        cleanups: [],
        clusterRadiusMeters,
        storageBackend: "localStorage",
      };
    }
  }
}

export async function saveReports(reports: WasteReport[]): Promise<void> {
  try {
    await replaceStoreAll(STORE_REPORTS, reports);
  } catch {
    window.localStorage.setItem(LS_REPORTS_KEY, JSON.stringify(reports));
  }
}

export async function saveCleanups(cleanups: CleanupActivity[]): Promise<void> {
  try {
    await replaceStoreAll(STORE_CLEANUPS, cleanups);
  } catch {
    window.localStorage.setItem(LS_CLEANUPS_KEY, JSON.stringify(cleanups));
  }
}

export function saveClusterRadius(radiusMeters: number): void {
  window.localStorage.setItem(LS_RADIUS_KEY, String(radiusMeters));
}

export async function clearAllPersistedData(): Promise<void> {
  try {
    await Promise.all([
      replaceStoreAll(STORE_REPORTS, []),
      replaceStoreAll(STORE_CLEANUPS, []),
    ]);
  } catch {
    // ignore
  }
  window.localStorage.removeItem(LS_REPORTS_KEY);
  window.localStorage.removeItem(LS_CLEANUPS_KEY);
}

/**
 * Validates and compresses an uploaded image file to keep browser storage
 * fast and within reasonable limits.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1024,
  quality = 0.78,
): Promise<{ dataUrl: string; mimeType: string; compressedBytes: number }> {
  const mime = file.type.toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(mime)) {
    throw new Error("Unsupported file type. Please choose a JPG, JPEG, PNG, or WEBP image.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image exceeds the 8 MB upload limit. Please select a smaller image.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read the selected image file."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Could not decode the uploaded image."));
    element.src = dataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const targetWidth = Math.max(1, Math.round(img.width * scale));
  const targetHeight = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { dataUrl, mimeType: mime, compressedBytes: file.size };
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  const outputMime = mime === "image/png" ? "image/jpeg" : mime === "image/webp" ? "image/webp" : "image/jpeg";
  const compressed = canvas.toDataURL(outputMime, quality);
  const base64Part = compressed.split(",")[1] ?? "";
  const compressedBytes = Math.round((base64Part.length * 3) / 4);

  return {
    dataUrl: compressed,
    mimeType: outputMime,
    compressedBytes,
  };
}

/**
 * Fetches a local static asset (such as a sample demonstration image) and
 * converts it into a compressed JPEG Data URL so it works with Gemini API
 * and IndexedDB persistence identically to user uploads.
 */
export async function imageUrlToCompressedDataUrl(url: string): Promise<{ dataUrl: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not load sample field photograph.");
  }
  const blob = await response.blob();
  const file = new File([blob], "sample_field_photo.jpg", { type: blob.type || "image/jpeg" });
  const compressed = await compressImageFile(file);
  return { dataUrl: compressed.dataUrl, mimeType: compressed.mimeType };
}
