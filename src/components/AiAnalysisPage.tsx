import { AlertTriangle, Loader2, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import type { AppPageId, WasteReport } from "../types/plasticwatch";
import { DemoOriginTag, StatusBadge } from "./StatusBadge";

interface AiAnalysisPageProps {
  reports: WasteReport[];
  selectedReportId: string | null;
  onSelectReportId: (id: string) => void;
  onRetryAnalysis: (reportId: string) => Promise<void>;
  onNavigate: (page: AppPageId) => void;
}

export function AiAnalysisPage({
  reports,
  selectedReportId,
  onSelectReportId,
  onRetryAnalysis,
  onNavigate,
}: AiAnalysisPageProps) {
  const activeReport =
    reports.find((r) => r.id === selectedReportId) ?? reports[0] ?? null;

  const isRunning = activeReport?.aiStatus === "PROCESSING";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#1F3329] pb-5">
        <div>
          <div className="text-xs font-medium text-emerald-400">
            Gemini AI Vision — Experimental Prototype
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            AI Image Analysis
          </h1>
          <p className="mt-1 text-sm text-[#9FB0A6]">
            Server-side Gemini multimodal assessment of visible waste. Visual triage only—never replaces human verification or laboratory testing.
          </p>
        </div>

        {reports.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="ai-report-select" className="text-xs text-[#9FB0A6] whitespace-nowrap">
              Inspect Report:
            </label>
            <select
              id="ai-report-select"
              value={activeReport?.id ?? ""}
              onChange={(e) => onSelectReportId(e.target.value)}
              className="rounded-lg border border-[#264034] bg-[#111B16] px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.reportDate}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!activeReport ? (
        <div className="rounded-xl border border-[#1F3329] bg-[#111B16] p-10 text-center space-y-4">
          <Sparkles className="w-8 h-8 mx-auto text-emerald-400" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">No reports available to inspect</h2>
            <p className="text-sm text-[#9FB0A6]">
              Submit a plastic waste photograph to run real server-side Gemini multimodal vision analysis.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("report")}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#05110B] hover:bg-emerald-400 cursor-pointer"
          >
            Go to Report Plastic Waste
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Uploaded Image + Report Metadata */}
          <div className="lg:col-span-5 rounded-xl border border-[#1F3329] bg-[#111B16] p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-white">
                {activeReport.id}
              </span>
              <StatusBadge status={activeReport.status} />
            </div>

            <div className="overflow-hidden rounded-lg border border-[#1F3329] bg-[#0E1713]">
              <img
                src={activeReport.imageDataUrl}
                alt={`Waste report ${activeReport.id}`}
                className="w-full h-72 object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-2 text-xs text-[#9FB0A6]">
              <div className="flex flex-wrap items-center gap-2">
                <span>{activeReport.reportDate}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">
                  {activeReport.latitude.toFixed(6)}, {activeReport.longitude.toFixed(6)}
                </span>
              </div>
              <div className="text-[#CBD5E1] font-medium">{activeReport.locationLabel}</div>
              {activeReport.description && (
                <p className="text-[#9FB0A6] leading-relaxed">{activeReport.description}</p>
              )}
              <div className="pt-1">
                <DemoOriginTag isDemoData={activeReport.isDemoData} />
              </div>
            </div>
          </div>

          {/* Right: Structured Gemini Output */}
          <div className="lg:col-span-7 rounded-xl border border-[#1F3329] bg-[#111B16] p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F3329] pb-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Visual Assessment Result
                </h2>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#9FB0A6]">
                  <span>AI Processing Status:</span>
                  <span className="font-mono font-medium text-white">
                    {activeReport.aiStatus}
                  </span>
                  {activeReport.aiResult?.modelName && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{activeReport.aiResult.modelName}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRetryAnalysis(activeReport.id)}
                disabled={isRunning}
                className="inline-flex items-center gap-2 rounded-lg border border-[#264034] bg-[#16241D] px-3.5 py-2 text-xs font-medium text-emerald-300 hover:bg-[#1D3027] disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>{activeReport.aiResult ? "Re-run Gemini Analysis" : "Run Gemini Analysis"}</span>
              </button>
            </div>

            {isRunning && (
              <div className="rounded-lg border border-sky-500/30 bg-sky-950/30 p-4 flex items-center gap-3 text-sm text-sky-200">
                <Loader2 className="w-5 h-5 animate-spin text-sky-400 shrink-0" />
                <span>Sending image to server-side Gemini multimodal vision model...</span>
              </div>
            )}

            {activeReport.aiStatus === "ERROR" && (
              <div
                role="alert"
                className="rounded-lg border border-rose-500/40 bg-rose-950/35 p-4 space-y-3"
              >
                <div className="flex items-start gap-2.5 text-sm text-rose-200">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-rose-100">
                      Gemini AI analysis failed — no fake fallback result was generated.
                    </div>
                    <p className="mt-1 text-xs text-rose-200/90">
                      {activeReport.aiError || "The server could not complete the AI request."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRetryAnalysis(activeReport.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry AI Analysis</span>
                </button>
              </div>
            )}

            {activeReport.aiResult && (
              <div className="space-y-5">
                {/* 3 Key Structured Triage Readouts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-[#1F3329] bg-[#0E1713] p-3.5">
                    <div className="text-xs text-[#9FB0A6]">Visible Plastic Likely?</div>
                    <div
                      className={`mt-1.5 text-xl font-mono font-semibold ${
                        activeReport.aiResult.plasticPresent === "YES"
                          ? "text-emerald-400"
                          : activeReport.aiResult.plasticPresent === "NO"
                          ? "text-slate-300"
                          : "text-amber-300"
                      }`}
                    >
                      {activeReport.aiResult.plasticPresent}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#1F3329] bg-[#0E1713] p-3.5">
                    <div className="text-xs text-[#9FB0A6]">Visible Quantity</div>
                    <div className="mt-1.5 text-xl font-mono font-semibold text-white">
                      {activeReport.aiResult.quantityEstimate}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#1F3329] bg-[#0E1713] p-3.5">
                    <div className="text-xs text-[#9FB0A6]">Suggested Triage Priority</div>
                    <div
                      className={`mt-1.5 text-xl font-mono font-semibold ${
                        activeReport.aiResult.suggestedPriority === "HIGH"
                          ? "text-rose-400"
                          : activeReport.aiResult.suggestedPriority === "MEDIUM"
                          ? "text-amber-300"
                          : "text-emerald-300"
                      }`}
                    >
                      {activeReport.aiResult.suggestedPriority}
                    </div>
                  </div>
                </div>

                {/* Recognised Categories */}
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-[#9FB0A6]">
                    Recognised Categories
                  </div>
                  <div className="text-sm font-medium text-white">
                    {activeReport.aiResult.categories.join(" · ")}
                  </div>
                </div>

                {/* Visible Evidence */}
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-[#9FB0A6]">
                    Visible Evidence Observed
                  </div>
                  <p className="text-sm text-[#E2E8F0] leading-relaxed">
                    {activeReport.aiResult.visibleEvidence}
                  </p>
                </div>

                {/* Explanation */}
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-[#9FB0A6]">
                    Assessment Explanation
                  </div>
                  <p className="text-sm text-[#CBD5E1] leading-relaxed">
                    {activeReport.aiResult.explanation}
                  </p>
                </div>

                {/* Limitations */}
                <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Limitations &amp; Responsible AI Safeguards</span>
                  </div>
                  <p className="text-xs text-amber-100/85 leading-relaxed">
                    {activeReport.aiResult.limitations} This prototype does not produce confidence percentages, exact item counts, weights, or identity attribution. AI predictions never automatically become human-verified reports.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
