import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Camera,
  Database,
  Download,
  FileJson,
  Flame,
  RotateCcw,
} from "lucide-react";
import type {
  AppPageId,
  CleanupActivity,
  HotspotCluster,
  WasteReport,
} from "../types/plasticwatch";
import {
  computeDashboardSummary,
  computeReportsByCategory,
  computeReportsOverTime,
  computeStatusDistribution,
} from "../utils/analytics";
import {
  buildProjectJsonExport,
  reportsToCsv,
  triggerFileDownload,
} from "../utils/export";

interface OverviewDashboardProps {
  reports: WasteReport[];
  hotspots: HotspotCluster[];
  cleanups: CleanupActivity[];
  storageBackend: string;
  onNavigate: (page: AppPageId) => void;
  onLoadDemoData: () => void;
  onResetAllData: () => Promise<void>;
}

export function OverviewDashboard({
  reports,
  hotspots,
  cleanups,
  storageBackend,
  onNavigate,
  onLoadDemoData,
  onResetAllData,
}: OverviewDashboardProps) {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const summary = computeDashboardSummary(reports, hotspots, cleanups);
  const categoryData = computeReportsByCategory(reports);
  const statusData = computeStatusDistribution(reports);
  const timeData = computeReportsOverTime(reports);

  const handleExportCsv = () => {
    const csv = reportsToCsv(reports);
    triggerFileDownload(csv, `plasticwatch-reports-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
  };

  const handleExportJson = () => {
    const json = buildProjectJsonExport(reports, cleanups);
    triggerFileDownload(json, `plasticwatch-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json;charset=utf-8;");
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await onResetAllData();
      setConfirmResetOpen(false);
    } finally {
      setIsResetting(false);
    }
  };

  const kpiCards = [
    {
      label: "Total Reports",
      value: summary.totalReports,
      detail:
        summary.demoReportsCount > 0
          ? `${summary.realReportsCount} field · ${summary.demoReportsCount} simulated`
          : "All calculated from local records",
      accent: "text-white",
    },
    {
      label: "Awaiting Verification",
      value: summary.awaitingVerification,
      detail: "Submitted, processing, or pending review",
      accent: "text-amber-300",
    },
    {
      label: "Verified Reports",
      value: summary.verifiedReports,
      detail: "Human-confirmed observations",
      accent: "text-emerald-400",
    },
    {
      label: "Potential Hotspots",
      value: summary.potentialHotspots,
      detail: "Clusters ≥ 2 reports within radius",
      accent: "text-amber-400",
    },
    {
      label: "Completed Cleanups",
      value: summary.completedCleanups,
      detail: "Logged & photo-documented activities",
      accent: "text-teal-300",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Data Controls */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between border-b border-[#1F3329] pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Overview Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#9FB0A6]">
            AJIET Mangalore &amp; surrounding community monitoring · Metrics computed strictly from saved records ({storageBackend}).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate("report")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-[#05110B] hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Report Plastic Waste</span>
          </button>
          <button
            type="button"
            onClick={onLoadDemoData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#264034] bg-[#14221B] px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-[#1A2D24] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Load Demo Data</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={reports.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1F3329] bg-[#111B16] px-3 py-2 text-xs font-medium text-[#CBD5E1] hover:bg-[#16241D] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            disabled={reports.length === 0 && cleanups.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1F3329] bg-[#111B16] px-3 py-2 text-xs font-medium text-[#CBD5E1] hover:bg-[#16241D] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            disabled={reports.length === 0 && cleanups.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-900/60 bg-[#1A1315] px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-950/50 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>

      {/* Simulated data banner when demo records are loaded */}
      {summary.demoReportsCount > 0 && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-950/30 px-4 py-3 text-sm text-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <strong className="font-semibold text-amber-300">
              SIMULATED DEMO DATA — NOT REAL FIELD OBSERVATIONS:
            </strong>{" "}
            <span>
              {summary.demoReportsCount} sample record(s) are currently loaded for demonstration alongside{" "}
              {summary.realReportsCount} user-submitted report(s).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="text-xs font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-200 self-start sm:self-center whitespace-nowrap cursor-pointer"
          >
            Clear All Data
          </button>
        </div>
      )}

      {/* Confirmation dialog for Reset Data */}
      {confirmResetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-[#264034] bg-[#111B16] p-6 shadow-2xl space-y-4">
            <h2 id="reset-dialog-title" className="text-lg font-semibold text-white">
              Reset Local PlasticWatch Data?
            </h2>
            <p className="text-sm text-[#9FB0A6] leading-relaxed">
              This clears all reports, AI analysis records, and cleanup logs stored in this browser ({storageBackend}). Consider exporting JSON or CSV first if you want a backup.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="rounded-lg border border-[#264034] px-4 py-2 text-sm font-medium text-[#CBD5E1] hover:bg-[#16241D] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
              >
                {isResetting ? "Clearing..." : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[#1F3329] bg-[#111B16] p-4 flex flex-col justify-between"
          >
            <div className="text-xs font-medium text-[#9FB0A6]">{card.label}</div>
            <div className={`mt-2 text-3xl font-semibold font-mono tabular-nums ${card.accent}`}>
              {card.value}
            </div>
            <div className="mt-2 text-xs text-[#6E8277]">{card.detail}</div>
          </div>
        ))}
      </div>

      {/* Empty State or Charts */}
      {reports.length === 0 ? (
        <div className="rounded-xl border border-[#1F3329] bg-[#111B16] p-10 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#16241D] border border-[#264034] text-emerald-400">
            <Flame className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-white">No reports stored yet</h2>
            <p className="text-sm text-[#9FB0A6]">
              PlasticWatch does not invent pollution statistics. Submit a real observation with a photo and map coordinates, or load clearly marked simulated demo records to explore the workflow.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate("report")}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#05110B] hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              Submit First Report
            </button>
            <button
              type="button"
              onClick={onLoadDemoData}
              className="rounded-lg border border-[#264034] bg-[#16241D] px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-[#1C2E25] transition-colors cursor-pointer"
            >
              Load Demo Data (Simulated)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart 1: Reports by Waste Category */}
          <div className="rounded-xl border border-[#1F3329] bg-[#111B16] p-5 lg:col-span-2">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-white">Reports by Waste Category</h2>
              <p className="text-xs text-[#9FB0A6]">
                Count of AI-recognised visible waste categories across saved reports
              </p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 8, right: 12, left: -12, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F3329" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fill: "#9FB0A6", fontSize: 10.5 }}
                    interval={0}
                    angle={-16}
                    textAnchor="end"
                    height={64}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: "#9FB0A6", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0E1713",
                      borderColor: "#264034",
                      color: "#F4F7F5",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" name="Reports" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Report Status Distribution */}
          <div className="rounded-xl border border-[#1F3329] bg-[#111B16] p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-white">Report Status Distribution</h2>
              <p className="text-xs text-[#9FB0A6]">
                Breakdown from submission to human verification and cleanup
              </p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="46%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0E1713",
                      borderColor: "#264034",
                      color: "#F4F7F5",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "#CBD5E1" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Reports Over Time */}
          <div className="rounded-xl border border-[#1F3329] bg-[#111B16] p-5 lg:col-span-3">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-white">Reports Over Time</h2>
              <p className="text-xs text-[#9FB0A6]">
                Daily report volume and verified count grouped by observation date
              </p>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeData} margin={{ top: 8, right: 16, left: -12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F3329" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#9FB0A6", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#9FB0A6", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0E1713",
                      borderColor: "#264034",
                      color: "#F4F7F5",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line
                    type="monotone"
                    dataKey="reports"
                    name="Total Reports"
                    stroke="#38BDF8"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#38BDF8" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="verified"
                    name="Verified / Cleaned"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#10B981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Local storage transparency note */}
      <div className="rounded-xl border border-[#1F3329] bg-[#0E1713] px-4 py-3 text-xs text-[#9FB0A6]">
        <strong className="text-[#CBD5E1]">Local Laptop Demo Storage:</strong> All reports, compressed photos, and cleanup records persist locally in this browser via {storageBackend}. This single-laptop demonstration does not sync to a shared cloud production database.
      </div>
    </div>
  );
}
