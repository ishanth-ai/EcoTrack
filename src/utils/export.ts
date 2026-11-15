import type { CleanupActivity, PlasticWatchBackup, WasteReport } from "../types/plasticwatch";

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function reportsToCsv(reports: WasteReport[]): string {
  const headers = [
    "report_id",
    "created_at",
    "report_date",
    "latitude",
    "longitude",
    "location_label",
    "description",
    "status",
    "data_origin",
    "ai_status",
    "ai_plastic_present",
    "ai_categories",
    "ai_quantity_estimate",
    "ai_suggested_priority",
    "ai_explanation",
    "review_notes",
    "reviewed_at",
    "cleanup_id",
    "has_image",
  ];

  const rows = reports.map((r) => [
    r.id,
    r.createdAt,
    r.reportDate,
    r.latitude,
    r.longitude,
    r.locationLabel,
    r.description,
    r.status,
    r.isDemoData ? "SIMULATED DEMO DATA — NOT REAL FIELD OBSERVATIONS" : "USER_SUBMITTED",
    r.aiStatus,
    r.aiResult?.plasticPresent ?? "",
    r.aiResult?.categories.join("; ") ?? "",
    r.aiResult?.quantityEstimate ?? "",
    r.aiResult?.suggestedPriority ?? "",
    r.aiResult?.explanation ?? "",
    r.reviewNotes,
    r.reviewedAt ?? "",
    r.cleanupId ?? "",
    Boolean(r.imageDataUrl),
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");
}

export function buildProjectJsonExport(
  reports: WasteReport[],
  cleanups: CleanupActivity[],
): string {
  const backup: PlasticWatchBackup = {
    exportedAt: new Date().toISOString(),
    appName: "PlasticWatch",
    storageNote:
      "Exported from browser-local storage for this single-laptop demonstration. Simulated demo records are flagged with isDemoData: true.",
    reports,
    cleanups,
  };
  return JSON.stringify(backup, null, 2);
}

export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
