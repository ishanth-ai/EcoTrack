import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  ImagePlus,
  Loader2,
  MapPin,
  Send,
  Sparkles,
} from "lucide-react";
import type { AppPageId, WasteReport } from "../types/plasticwatch";
import { LeafletMap } from "./LeafletMap";
import {
  compressImageFile,
  imageUrlToCompressedDataUrl,
} from "../utils/storage";
import { SAMPLE_BOTTLES_IMAGE } from "../utils/demoData";

interface ReportWastePageProps {
  existingReports: WasteReport[];
  onSubmitReport: (draft: {
    latitude: number;
    longitude: number;
    locationLabel: string;
    description: string;
    imageDataUrl: string;
    mimeType: string;
  }) => Promise<WasteReport>;
  onNavigate: (page: AppPageId, reportId?: string) => void;
}

export function ReportWastePage({
  existingReports,
  onSubmitReport,
  onNavigate,
}: ReportWastePageProps) {
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [compressedInfo, setCompressedInfo] = useState<string>("");
  const [latitudeInput, setLatitudeInput] = useState<string>("");
  const [longitudeInput, setLongitudeInput] = useState<string>("");
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isLocating, setIsLocating] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<WasteReport | null>(null);

  const parsedLat = Number(latitudeInput);
  const parsedLng = Number(longitudeInput);
  const hasValidCoords =
    latitudeInput.trim() !== "" &&
    longitudeInput.trim() !== "" &&
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLng) &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLng >= -180 &&
    parsedLng <= 180;

  const selectedLocation = hasValidCoords ? { lat: parsedLat, lng: parsedLng } : null;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setValidationError(null);
    setIsCompressing(true);
    try {
      const result = await compressImageFile(file);
      setImageDataUrl(result.dataUrl);
      setMimeType(result.mimeType);
      setCompressedInfo(`${Math.max(1, Math.round(result.compressedBytes / 1024))} KB stored`);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Failed to process image.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleLoadSamplePhoto = async () => {
    setValidationError(null);
    setIsCompressing(true);
    try {
      const result = await imageUrlToCompressedDataUrl(SAMPLE_BOTTLES_IMAGE);
      setImageDataUrl(result.dataUrl);
      setMimeType(result.mimeType);
      setCompressedInfo("Sample field photograph ready");
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Unable to load sample photo.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setGeoMessage(null);
    setValidationError(null);
    if (!("geolocation" in navigator)) {
      setGeoMessage(
        "Geolocation is not supported in this browser. Please click the map to select your exact location.",
      );
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitudeInput(position.coords.latitude.toFixed(6));
        setLongitudeInput(position.coords.longitude.toFixed(6));
        setGeoMessage(
          `GPS coordinates captured (±${Math.round(position.coords.accuracy)}m accuracy). You may still adjust the pin on the map.`,
        );
        setIsLocating(false);
      },
      (err) => {
        const reason =
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied."
            : "Current device location could not be retrieved.";
        setGeoMessage(`${reason} Please click directly on the map or enter coordinates manually.`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  };

  const handleMapSelect = (lat: number, lng: number) => {
    setLatitudeInput(lat.toFixed(6));
    setLongitudeInput(lng.toFixed(6));
    setValidationError(null);
    setGeoMessage(`Location pinned at ${lat.toFixed(6)}, ${lng.toFixed(6)}. You can edit it anytime before submitting.`);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!imageDataUrl) {
      setValidationError("Please upload a waste photograph (JPG, JPEG, PNG, or WEBP) before submitting.");
      return;
    }

    if (!hasValidCoords) {
      setValidationError(
        "Location coordinates are required. Click on the map or use your device GPS to select the observation spot.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await onSubmitReport({
        latitude: Number(parsedLat.toFixed(6)),
        longitude: Number(parsedLng.toFixed(6)),
        locationLabel: locationLabel.trim() || "Mangalore Community Observation",
        description: description.trim(),
        imageDataUrl,
        mimeType,
      });
      setSubmittedReport(created);
      setImageDataUrl("");
      setCompressedInfo("");
      setLatitudeInput("");
      setLongitudeInput("");
      setLocationLabel("");
      setDescription("");
      setGeoMessage(null);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Failed to save report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#1F3329] pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Report Plastic Waste
        </h1>
        <p className="mt-1 text-sm text-[#9FB0A6]">
          Upload a photograph and pinpoint the location on the map. Campus center is never auto-assigned—select the actual observation coordinates.
        </p>
      </div>

      {submittedReport && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-950/35 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white">
                Report Submitted: <span className="font-mono text-emerald-300">{submittedReport.id}</span>
              </div>
              <p className="text-xs text-[#CBD5E1]">
                Saved locally and added to the GIS map and dashboard.{" "}
                {submittedReport.aiStatus === "COMPLETED"
                  ? "Gemini AI visual analysis completed and queued for human review."
                  : submittedReport.aiStatus === "ERROR"
                  ? "Report saved, though Gemini AI analysis encountered an error — you can retry it on the AI Image Analysis page."
                  : "Gemini AI visual analysis is running."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate("ai-analysis", submittedReport.id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-[#05110B] hover:bg-emerald-400 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>View AI Analysis</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("gis-map")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#264034] bg-[#14221B] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1A2D24] cursor-pointer whitespace-nowrap"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>View on GIS Map</span>
            </button>
          </div>
        </div>
      )}

      {validationError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200 flex items-center gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Upload + Details */}
        <div className="lg:col-span-5 space-y-5 rounded-xl border border-[#1F3329] bg-[#111B16] p-5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label htmlFor="waste-photo-upload" className="text-sm font-medium text-white">
                1. Waste Photograph <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleLoadSamplePhoto}
                disabled={isCompressing}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer"
              >
                Use Sample Field Photo
              </button>
            </div>

            <label
              htmlFor="waste-photo-upload"
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2C4A3B] bg-[#0E1713] p-5 text-center hover:border-emerald-500/60 transition-colors cursor-pointer"
            >
              {isCompressing ? (
                <div className="flex items-center gap-2 text-sm text-[#9FB0A6] py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Compressing image for local browser storage...</span>
                </div>
              ) : imageDataUrl ? (
                <div className="w-full space-y-2">
                  <img
                    src={imageDataUrl}
                    alt="Uploaded waste observation preview"
                    className="w-full h-52 object-cover rounded-lg border border-[#1F3329]"
                  />
                  <div className="flex items-center justify-between text-xs text-[#9FB0A6]">
                    <span>{compressedInfo}</span>
                    <span className="text-emerald-400 font-medium">Click to replace photo</span>
                  </div>
                </div>
              ) : (
                <div className="py-5 space-y-2">
                  <ImagePlus className="w-8 h-8 mx-auto text-emerald-400" />
                  <div className="text-sm font-medium text-white">
                    Choose JPG, JPEG, PNG, or WEBP
                  </div>
                  <div className="text-xs text-[#6E8277]">
                    Max 8 MB raw file · Automatically compressed for browser persistence
                  </div>
                </div>
              )}
              <input
                id="waste-photo-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-white">
                2. Coordinates <span className="text-rose-400">*</span>
              </span>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#264034] bg-[#16241D] px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-[#1C2E25] cursor-pointer whitespace-nowrap"
              >
                {isLocating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Crosshair className="w-3.5 h-3.5" />
                )}
                <span>Use Current Location</span>
              </button>
            </div>

            {geoMessage && (
              <p className="text-xs text-[#CBD5E1] bg-[#0E1713] border border-[#1F3329] rounded-lg px-3 py-2">
                {geoMessage}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="report-lat" className="block text-xs text-[#9FB0A6] mb-1">
                  Latitude
                </label>
                <input
                  id="report-lat"
                  type="number"
                  step="any"
                  placeholder="Click map or enter"
                  value={latitudeInput}
                  onChange={(e) => setLatitudeInput(e.target.value)}
                  className="w-full rounded-lg border border-[#1F3329] bg-[#0E1713] px-3 py-2 text-sm font-mono text-white placeholder:text-[#6E8277] focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="report-lng" className="block text-xs text-[#9FB0A6] mb-1">
                  Longitude
                </label>
                <input
                  id="report-lng"
                  type="number"
                  step="any"
                  placeholder="Click map or enter"
                  value={longitudeInput}
                  onChange={(e) => setLongitudeInput(e.target.value)}
                  className="w-full rounded-lg border border-[#1F3329] bg-[#0E1713] px-3 py-2 text-sm font-mono text-white placeholder:text-[#6E8277] focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="location-label" className="block text-xs text-[#9FB0A6] mb-1">
                Location Landmark (optional)
              </label>
              <input
                id="location-label"
                type="text"
                placeholder="e.g., Kottara Chowki Bus Stop, AJIET Back Gate"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                className="w-full rounded-lg border border-[#1F3329] bg-[#0E1713] px-3 py-2 text-sm text-white placeholder:text-[#6E8277] focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="report-description" className="block text-xs text-[#9FB0A6] mb-1">
                Field Description (optional)
              </label>
              <textarea
                id="report-description"
                rows={3}
                placeholder="Describe drainage proximity, access notes, or visible waste context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-[#1F3329] bg-[#0E1713] px-3 py-2 text-sm text-white placeholder:text-[#6E8277] focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isCompressing}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#05110B] hover:bg-emerald-400 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting &amp; Running Gemini Analysis...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Report &amp; Analyze</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Interactive Map Selection */}
        <div className="lg:col-span-7 rounded-xl border border-[#1F3329] bg-[#111B16] p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">
                Click Map to Pin Exact Location
              </h2>
              <p className="text-xs text-[#9FB0A6]">
                Centered near AJIET, Mangalore (12.9095° N, 74.8385° E). Click anywhere on the map to set or move the report pin.
              </p>
            </div>
            {selectedLocation && (
              <span className="text-xs font-mono text-emerald-300 whitespace-nowrap">
                {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
              </span>
            )}
          </div>

          <LeafletMap
            reports={existingReports}
            selectedLocation={selectedLocation}
            pickMode={true}
            onSelectLocation={handleMapSelect}
            heightClass="h-[440px]"
            testId="report-picker-map"
          />
        </div>
      </form>
    </div>
  );
}
