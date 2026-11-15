import { useMemo, useState } from "react";
import { CheckCircle2, Eye, HelpCircle, ShieldCheck, X, XCircle } from "lucide-react";
import type { ReportStatus, UserRoleMode, WasteReport } from "../types/plasticwatch";
import { DemoOriginTag, StatusBadge } from "./StatusBadge";

interface VerificationPageProps {
  reports: WasteReport[];
  roleMode: UserRoleMode;
  onSwitchToAdmin: () => void;
  onUpdateReportReview: (
    reportId: string,
    status: ReportStatus,
    reviewNotes: string,
  ) => Promise<void>;
}

export function VerificationPage({
  reports,
  roleMode,
  onSwitchToAdmin,
  onUpdateReportReview,
}: VerificationPageProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [originFilter, setOriginFilter] = useState<"ALL" | "REAL" | "DEMO">("ALL");
  const [inspectingId, setInspectingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (originFilter === "REAL" && r.isDemoData) return false;
      if (originFilter === "DEMO" && !r.isDemoData) return false;
      return true;
    });
  }, [reports, statusFilter, originFilter]);

  const inspectingReport = reports.find((r) => r.id === inspectingId) ?? null;

  const openInspector = (report: WasteReport) => {
    setInspectingId(report.id);
    setNotesDraft(report.reviewNotes ?? "");
  };

  const handleDecision = async (status: ReportStatus) => {
    if (!inspectingReport || roleMode !== "ADMIN") return;
    setIsSaving(true);
    try {
      await onUpdateReportReview(inspectingReport.id, status, notesDraft.trim());
      setInspectingId(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-[#1F3329] pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Reports &amp; Human Verification
          </h1>
          <p className="mt-1 text-sm text-[#9FB0A6]">
            Review submitted evidence and Gemini AI suggestions. AI predictions never automatically become human-verified reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter reports by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#264034] bg-[#111B16] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="AI_PROCESSING">AI Processing</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="VERIFIED">Verified</option>
            <option value="NEEDS_MORE_INFORMATION">Needs More Info</option>
            <option value="REJECTED">Rejected</option>
            <option value="CLEANUP_COMPLETED">Cleanup Completed</option>
          </select>

          <select
            aria-label="Filter reports by data origin"
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value as "ALL" | "REAL" | "DEMO")}
            className="rounded-lg border border-[#264034] bg-[#111B16] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Origins ({reports.length})</option>
            <option value="REAL">Real Submissions</option>
            <option value="DEMO">Simulated Demo Data</option>
          </select>
        </div>
      </div>

      {roleMode !== "ADMIN" && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Currently in <strong>Citizen View</strong> (read-only). Switch to Demo Admin View to verify, reject, or request more info.
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

      {filteredReports.length === 0 ? (
        <div className="rounded-xl border border-[#1F3329] bg-[#111B16] p-10 text-center text-sm text-[#9FB0A6]">
          No reports match the selected filters.
        </div>
      ) : (
        <div className="rounded-xl border border-[#1F3329] bg-[#111B16] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1F3329] bg-[#14201A] text-xs font-medium text-[#9FB0A6]">
                  <th className="py-3 px-4">Report ID</th>
                  <th className="py-3 px-4">Photo</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">AI Assessment</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F3329] text-sm">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-[#15231C] transition-colors">
                    <td className="py-3 px-4 align-top">
                      <div className="font-mono text-xs font-semibold text-white whitespace-nowrap">
                        {report.id}
                      </div>
                      {report.isDemoData && (
                        <div className="mt-1 text-[10px] text-amber-300">
                          SIMULATED DEMO
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top">
                      <img
                        src={report.imageDataUrl}
                        alt={`Thumbnail for ${report.id}`}
                        className="w-14 h-10 object-cover rounded border border-[#264034]"
                        referrerPolicy="no-referrer"
                      />
                    </td>
                    <td className="py-3 px-4 align-top font-mono text-xs text-[#CBD5E1] whitespace-nowrap">
                      {report.reportDate}
                    </td>
                    <td className="py-3 px-4 align-top max-w-[200px]">
                      <div className="text-xs font-medium text-white truncate">
                        {report.locationLabel}
                      </div>
                      <div className="text-[11px] font-mono text-[#6E8277]">
                        {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top font-mono text-xs whitespace-nowrap">
                      {report.aiResult ? (
                        <span
                          className={
                            report.aiResult.plasticPresent === "YES"
                              ? "text-emerald-400"
                              : report.aiResult.plasticPresent === "NO"
                              ? "text-slate-300"
                              : "text-amber-300"
                          }
                        >
                          {report.aiResult.plasticPresent} · {report.aiResult.quantityEstimate}
                        </span>
                      ) : (
                        <span className="text-[#6E8277]">{report.aiStatus}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top text-xs text-[#CBD5E1] max-w-[180px]">
                      {report.aiResult?.categories.join(", ") || "Pending"}
                    </td>
                    <td className="py-3 px-4 align-top">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="py-3 px-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => openInspector(report)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#264034] bg-[#16241D] px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-[#1E3228] cursor-pointer whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{roleMode === "ADMIN" ? "Review & Verify" : "Inspect"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspection & Human Verification Modal */}
      {inspectingReport && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
        >
          <div className="w-full max-w-3xl rounded-xl border border-[#264034] bg-[#111B16] shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between border-b border-[#1F3329] px-5 py-4">
              <div>
                <h2 id="verify-modal-title" className="text-lg font-semibold text-white">
                  Human Verification · <span className="font-mono text-emerald-300">{inspectingReport.id}</span>
                </h2>
                <div className="mt-0.5">
                  <DemoOriginTag isDemoData={inspectingReport.isDemoData} />
                </div>
              </div>
              <button
                type="button"
                aria-label="Close verification dialog"
                onClick={() => setInspectingId(null)}
                className="rounded-lg p-1.5 text-[#9FB0A6] hover:bg-[#16241D] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[75vh] overflow-y-auto">
              <div className="space-y-3">
                <img
                  src={inspectingReport.imageDataUrl}
                  alt={`Original field image for ${inspectingReport.id}`}
                  className="w-full h-64 object-cover rounded-lg border border-[#1F3329]"
                  referrerPolicy="no-referrer"
                />
                <div className="text-xs text-[#CBD5E1] space-y-1">
                  <div>
                    <span className="text-[#9FB0A6]">Location:</span> {inspectingReport.locationLabel}
                  </div>
                  <div className="font-mono text-[#9FB0A6]">
                    {inspectingReport.latitude.toFixed(6)}, {inspectingReport.longitude.toFixed(6)} · {inspectingReport.reportDate}
                  </div>
                  {inspectingReport.description && (
                    <p className="text-[#9FB0A6] pt-1">{inspectingReport.description}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-[#1F3329] bg-[#0E1713] p-3.5 space-y-2 text-xs">
                  <div className="font-semibold text-white">Gemini AI Visual Assessment</div>
                  {inspectingReport.aiResult ? (
                    <>
                      <div className="text-[#CBD5E1]">
                        Assessment: <strong className="font-mono text-emerald-300">{inspectingReport.aiResult.plasticPresent}</strong> · Quantity: <strong className="font-mono">{inspectingReport.aiResult.quantityEstimate}</strong>
                      </div>
                      <div className="text-[#CBD5E1]">
                        Categories: {inspectingReport.aiResult.categories.join(", ")}
                      </div>
                      <p className="text-[#9FB0A6] leading-relaxed">
                        {inspectingReport.aiResult.explanation}
                      </p>
                    </>
                  ) : (
                    <div className="text-[#9FB0A6]">
                      AI Status: {inspectingReport.aiStatus} {inspectingReport.aiError ? `(${inspectingReport.aiError})` : ""}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="admin-review-notes" className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                    Administrator Review Notes
                  </label>
                  <textarea
                    id="admin-review-notes"
                    rows={3}
                    disabled={roleMode !== "ADMIN"}
                    placeholder="Add inspection notes, site landmark details, or reason for rejection..."
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    className="w-full rounded-lg border border-[#264034] bg-[#0E1713] px-3 py-2 text-sm text-white placeholder:text-[#6E8277] disabled:opacity-60 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {roleMode === "ADMIN" ? (
                  <div className="space-y-2 pt-1">
                    <div className="text-xs text-[#9FB0A6]">Set Human Verification Decision:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleDecision("VERIFIED")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-[#05110B] hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark VERIFIED</span>
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleDecision("NEEDS_MORE_INFORMATION")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-950/40 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-900/50 disabled:opacity-50 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Needs Info</span>
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleDecision("REJECTED")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-900/50 disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Mark REJECTED</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onSwitchToAdmin}
                    className="w-full rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-[#111B16] hover:bg-amber-300 cursor-pointer"
                  >
                    Switch to Demo Admin View to Verify
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
