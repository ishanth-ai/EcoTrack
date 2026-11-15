import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ImagePlus,
  ShieldCheck,
} from "lucide-react";
import type { CleanupActivity, HotspotCluster, UserRoleMode } from "../types/plasticwatch";
import { compressImageFile, imageUrlToCompressedDataUrl } from "../utils/storage";
import { SAMPLE_AFTER_CLEANUP_IMAGE, SAMPLE_BAGS_IMAGE } from "../utils/demoData";

interface CleanupTrackingPageProps {
  hotspots: HotspotCluster[];
  cleanups: CleanupActivity[];
  roleMode: UserRoleMode;
  onSwitchToAdmin: () => void;
  onCreateCleanup: (input: {
    hotspot: HotspotCluster;
    scheduledDate: string;
    organizerName: string;
    notes: string;
    beforePhotoDataUrl: string | null;
    afterPhotoDataUrl: string | null;
    measuredKg: number | null;
    markCompletedImmediately: boolean;
  }) => Promise<void>;
  onMarkCleanupCompleted: (
    cleanupId: string,
    afterPhotoDataUrl?: string | null,
    measuredKg?: number | null,
  ) => Promise<void>;
}

export function CleanupTrackingPage({
  hotspots,
  cleanups,
  roleMode,
  onSwitchToAdmin,
  onCreateCleanup,
  onMarkCleanupCompleted,
}: CleanupTrackingPageProps) {
  const [selectedHotspotId, setSelectedHotspotId] = useState<string>(hotspots[0]?.id ?? "");
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [organizerName, setOrganizerName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [measuredKgInput, setMeasuredKgInput] = useState<string>("");
  const [beforePhotoDataUrl, setBeforePhotoDataUrl] = useState<string | null>(null);
  const [afterPhotoDataUrl, setAfterPhotoDataUrl] = useState<string | null>(null);
  const [markCompleted, setMarkCompleted] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeHotspot =
    hotspots.find((h) => h.id === selectedHotspotId) ?? hotspots[0] ?? null;

  const handlePhotoUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    target: "before" | "after",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    try {
      const compressed = await compressImageFile(file);
      if (target === "before") {
        setBeforePhotoDataUrl(compressed.dataUrl);
      } else {
        setAfterPhotoDataUrl(compressed.dataUrl);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to process cleanup image.");
    }
  };

  const handleLoadSampleBeforeAfter = async () => {
    setFormError(null);
    try {
      const [before, after] = await Promise.all([
        imageUrlToCompressedDataUrl(SAMPLE_BAGS_IMAGE),
        imageUrlToCompressedDataUrl(SAMPLE_AFTER_CLEANUP_IMAGE),
      ]);
      setBeforePhotoDataUrl(before.dataUrl);
      setAfterPhotoDataUrl(after.dataUrl);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not load sample cleanup photos.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (roleMode !== "ADMIN") {
      setFormError("Switch to Demo Admin View to log or update cleanup activities.");
      return;
    }

    if (!activeHotspot) {
      setFormError("Select a detected Potential Hotspot before creating a cleanup activity.");
      return;
    }

    if (!organizerName.trim()) {
      setFormError("Enter an organiser or volunteer team name.");
      return;
    }

    let measuredKg: number | null = null;
    if (measuredKgInput.trim() !== "") {
      const parsed = Number(measuredKgInput);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setFormError("Measured waste (kg) must be a valid non-negative number if provided.");
        return;
      }
      measuredKg = parsed;
    }

    setIsSubmitting(true);
    try {
      await onCreateCleanup({
        hotspot: activeHotspot,
        scheduledDate,
        organizerName: organizerName.trim(),
        notes: notes.trim(),
        beforePhotoDataUrl,
        afterPhotoDataUrl,
        measuredKg,
        markCompletedImmediately: markCompleted,
      });
      setOrganizerName("");
      setNotes("");
      setMeasuredKgInput("");
      setBeforePhotoDataUrl(null);
      setAfterPhotoDataUrl(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#1F3329] pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Cleanup Tracking
        </h1>
        <p className="mt-1 text-sm text-[#9FB0A6]">
          Coordinate field cleanup drives linked to Potential Hotspots and document before/after outcomes. Waste weight is only recorded when explicitly weighed and entered by the team.
        </p>
      </div>

      {roleMode !== "ADMIN" && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Currently in <strong>Citizen View</strong>. Switch to Demo Admin View to create or complete cleanup drives.
            </span>
          </div>
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-[#111B16] hover:bg-amber-300 whitespace-nowrap self-start sm:self-center cursor-pointer"
          >
            Switch to Admin View
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Create Cleanup Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-xl border border-[#1F3329] bg-[#111B16] p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">
              Create Cleanup Activity
            </h2>
            <button
              type="button"
              onClick={handleLoadSampleBeforeAfter}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer"
            >
              Load Sample Photos
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/40 bg-rose-950/35 px-3 py-2.5 text-xs text-rose-200 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label htmlFor="cleanup-hotspot" className="block text-xs text-[#9FB0A6] mb-1">
              Select Potential Hotspot <span className="text-rose-400">*</span>
            </label>
            {hotspots.length === 0 ? (
              <div className="rounded-lg border border-[#1F3329] bg-[#0E1713] px-3 py-2.5 text-xs text-[#9FB0A6]">
                No Potential Hotspots available yet. At least 2 nearby reports are needed to form a cluster.
              </div>
            ) : (
              <select
                id="cleanup-hotspot"
                value={activeHotspot?.id ?? ""}
                onChange={(e) => setSelectedHotspotId(e.target.value)}
                className="w-full rounded-lg border border-[#264034] bg-[#0E1713] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {hotspots.map((hs) => (
                  <option key={hs.id} value={hs.id}>
                    {hs.label} ({hs.reportCount} reports · Score {hs.priorityScore})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cleanup-date" className="block text-xs text-[#9FB0A6] mb-1">
                Cleanup Date <span className="text-rose-400">*</span>
              </label>
              <input
                id="cleanup-date"
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-lg border border-[#264034] bg-[#0E1713] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="cleanup-kg" className="block text-xs text-[#9FB0A6] mb-1">
                Actual Measured kg (optional)
              </label>
              <input
                id="cleanup-kg"
                type="number"
                step="0.1"
                min="0"
                placeholder="Only if weighed"
                value={measuredKgInput}
                onChange={(e) => setMeasuredKgInput(e.target.value)}
                className="w-full rounded-lg border border-[#264034] bg-[#0E1713] px-3 py-2 text-sm font-mono text-white placeholder:text-[#6E8277] focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cleanup-organizer" className="block text-xs text-[#9FB0A6] mb-1">
              Organiser / Team Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="cleanup-organizer"
              type="text"
              placeholder="e.g., AJIET NSS Unit & Eco-Club"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              className="w-full rounded-lg border border-[#264034] bg-[#0E1713] px-3 py-2 text-sm text-white placeholder:text-[#6E8277] focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cleanup-notes" className="block text-xs text-[#9FB0A6] mb-1">
              Field Notes
            </label>
            <textarea
              id="cleanup-notes"
              rows={2}
              placeholder="Disposal handover details, safety notes, or local coordination..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-[#264034] bg-[#0E1713] px-3 py-2 text-sm text-white placeholder:text-[#6E8277] focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Before & After Photo Uploads */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="before-photo-input" className="block text-xs text-[#9FB0A6] mb-1">
                Before-Cleanup Photo
              </label>
              <label
                htmlFor="before-photo-input"
                className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#264034] bg-[#0E1713] p-2.5 h-28 cursor-pointer hover:border-emerald-500/60"
              >
                {beforePhotoDataUrl ? (
                  <img
                    src={beforePhotoDataUrl}
                    alt="Before cleanup preview"
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="text-center space-y-1">
                    <ImagePlus className="w-5 h-5 mx-auto text-emerald-400" />
                    <div className="text-[11px] text-[#9FB0A6]">Upload Before</div>
                  </div>
                )}
                <input
                  id="before-photo-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(e) => handlePhotoUpload(e, "before")}
                  className="sr-only"
                />
              </label>
            </div>

            <div>
              <label htmlFor="after-photo-input" className="block text-xs text-[#9FB0A6] mb-1">
                After-Cleanup Photo
              </label>
              <label
                htmlFor="after-photo-input"
                className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#264034] bg-[#0E1713] p-2.5 h-28 cursor-pointer hover:border-emerald-500/60"
              >
                {afterPhotoDataUrl ? (
                  <img
                    src={afterPhotoDataUrl}
                    alt="After cleanup preview"
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="text-center space-y-1">
                    <ImagePlus className="w-5 h-5 mx-auto text-emerald-400" />
                    <div className="text-[11px] text-[#9FB0A6]">Upload After</div>
                  </div>
                )}
                <input
                  id="after-photo-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(e) => handlePhotoUpload(e, "after")}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
            <input
              type="checkbox"
              checked={markCompleted}
              onChange={(e) => setMarkCompleted(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
            <span>Mark cleanup as completed immediately (updates linked reports)</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting || hotspots.length === 0 || roleMode !== "ADMIN"}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#05110B] hover:bg-emerald-400 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>{isSubmitting ? "Saving Cleanup..." : "Save Cleanup Activity"}</span>
          </button>
        </form>

        {/* Right: Logged Cleanup Activities */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-semibold text-white">
            Logged Cleanup Activities ({cleanups.length})
          </h2>

          {cleanups.length === 0 ? (
            <div className="rounded-xl border border-[#1F3329] bg-[#111B16] p-8 text-center text-sm text-[#9FB0A6]">
              No cleanup activities logged yet. Select a Potential Hotspot and record a volunteer cleanup activity.
            </div>
          ) : (
            <div className="space-y-4">
              {cleanups.map((cleanup) => (
                <div
                  key={cleanup.id}
                  className="rounded-xl border border-[#1F3329] bg-[#111B16] p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-emerald-300">
                          {cleanup.id}
                        </span>
                        <span aria-hidden="true" className="text-[#6E8277]">·</span>
                        <span className="text-xs font-mono text-[#CBD5E1]">
                          {cleanup.scheduledDate}
                        </span>
                        {cleanup.isDemoData && (
                          <>
                            <span aria-hidden="true" className="text-[#6E8277]">·</span>
                            <span className="text-[11px] font-medium text-amber-300">
                              SIMULATED DEMO DATA
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="mt-1 text-base font-semibold text-white">
                        {cleanup.hotspotLabel}
                      </h3>
                      <div className="mt-0.5 text-xs text-[#9FB0A6]">
                        Organiser: <span className="text-[#E2E8F0]">{cleanup.organizerName}</span>
                        {cleanup.measuredKg !== null && (
                          <span>
                            {" "}· Measured weight:{" "}
                            <strong className="font-mono text-emerald-300">
                              {cleanup.measuredKg} kg
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {cleanup.status === "COMPLETED" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={roleMode !== "ADMIN"}
                          onClick={() => onMarkCleanupCompleted(cleanup.id)}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-[#05110B] hover:bg-emerald-400 disabled:opacity-45 cursor-pointer"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>

                  {cleanup.notes && (
                    <p className="text-xs text-[#CBD5E1] leading-relaxed">{cleanup.notes}</p>
                  )}

                  <div className="text-xs text-[#9FB0A6]">
                    Linked Reports:{" "}
                    <span className="font-mono text-white">
                      {cleanup.linkedReportIds.join(", ")}
                    </span>
                  </div>

                  {(cleanup.beforePhotoDataUrl || cleanup.afterPhotoDataUrl) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {cleanup.beforePhotoDataUrl && (
                        <div className="space-y-1">
                          <div className="text-[11px] font-medium text-[#9FB0A6]">Before Cleanup</div>
                          <img
                            src={cleanup.beforePhotoDataUrl}
                            alt={`Before cleanup for ${cleanup.id}`}
                            className="w-full h-40 object-cover rounded-lg border border-[#1F3329]"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      {cleanup.afterPhotoDataUrl && (
                        <div className="space-y-1">
                          <div className="text-[11px] font-medium text-emerald-300">After Cleanup</div>
                          <img
                            src={cleanup.afterPhotoDataUrl}
                            alt={`After cleanup for ${cleanup.id}`}
                            className="w-full h-40 object-cover rounded-lg border border-[#1F3329]"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
