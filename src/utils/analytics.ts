import type {
  CleanupActivity,
  HotspotCluster,
  ReportStatus,
  WasteCategory,
  WasteReport,
} from "../types/plasticwatch";

export interface DashboardSummary {
  totalReports: number;
  awaitingVerification: number;
  verifiedReports: number;
  potentialHotspots: number;
  completedCleanups: number;
  realReportsCount: number;
  demoReportsCount: number;
}

export interface CategoryChartDatum {
  category: string;
  count: number;
}

export interface StatusChartDatum {
  status: ReportStatus;
  label: string;
  count: number;
  color: string;
}

export interface TimeSeriesDatum {
  date: string;
  reports: number;
  verified: number;
}

const ALL_CATEGORIES: WasteCategory[] = [
  "Plastic bottles",
  "Plastic bags",
  "Plastic wrappers",
  "Plastic containers",
  "Other visible litter",
  "Uncertain / not identifiable",
];

const STATUS_META: Record<ReportStatus, { label: string; color: string }> = {
  SUBMITTED: { label: "Submitted", color: "#38BDF8" },
  AI_PROCESSING: { label: "AI Processing", color: "#818CF8" },
  PENDING_REVIEW: { label: "Pending Review", color: "#F59E0B" },
  NEEDS_MORE_INFORMATION: { label: "Needs Info", color: "#FB923C" },
  VERIFIED: { label: "Verified", color: "#10B981" },
  REJECTED: { label: "Rejected", color: "#EF4444" },
  CLEANUP_COMPLETED: { label: "Cleaned Up", color: "#34D399" },
};

export function getStatusLabel(status: ReportStatus): string {
  return STATUS_META[status]?.label ?? status;
}

export function getStatusColor(status: ReportStatus): string {
  return STATUS_META[status]?.color ?? "#94A3B8";
}

export function computeDashboardSummary(
  reports: WasteReport[],
  hotspots: HotspotCluster[],
  cleanups: CleanupActivity[],
): DashboardSummary {
  const awaitingStatuses = new Set<ReportStatus>([
    "SUBMITTED",
    "AI_PROCESSING",
    "PENDING_REVIEW",
    "NEEDS_MORE_INFORMATION",
  ]);
  const verifiedStatuses = new Set<ReportStatus>(["VERIFIED", "CLEANUP_COMPLETED"]);

  return {
    totalReports: reports.length,
    awaitingVerification: reports.filter((r) => awaitingStatuses.has(r.status)).length,
    verifiedReports: reports.filter((r) => verifiedStatuses.has(r.status)).length,
    potentialHotspots: hotspots.length,
    completedCleanups: cleanups.filter((c) => c.status === "COMPLETED").length,
    realReportsCount: reports.filter((r) => !r.isDemoData).length,
    demoReportsCount: reports.filter((r) => r.isDemoData).length,
  };
}

export function computeReportsByCategory(reports: WasteReport[]): CategoryChartDatum[] {
  const counts = new Map<string, number>();
  for (const cat of ALL_CATEGORIES) {
    counts.set(cat, 0);
  }

  for (const report of reports) {
    const categories = report.aiResult?.categories ?? [];
    if (categories.length === 0) {
      counts.set("Uncertain / not identifiable", (counts.get("Uncertain / not identifiable") ?? 0) + 1);
    } else {
      for (const cat of categories) {
        counts.set(cat, (counts.get(cat) ?? 0) + 1);
      }
    }
  }

  return ALL_CATEGORIES.map((category) => ({
    category,
    count: counts.get(category) ?? 0,
  }));
}

export function computeStatusDistribution(reports: WasteReport[]): StatusChartDatum[] {
  const counts = new Map<ReportStatus, number>();
  for (const report of reports) {
    counts.set(report.status, (counts.get(report.status) ?? 0) + 1);
  }

  return (Object.keys(STATUS_META) as ReportStatus[])
    .map((status) => ({
      status,
      label: STATUS_META[status].label,
      count: counts.get(status) ?? 0,
      color: STATUS_META[status].color,
    }))
    .filter((item) => item.count > 0);
}

export function computeReportsOverTime(reports: WasteReport[]): TimeSeriesDatum[] {
  const byDate = new Map<string, { reports: number; verified: number }>();

  for (const report of reports) {
    const entry = byDate.get(report.reportDate) ?? { reports: 0, verified: 0 };
    entry.reports += 1;
    if (report.status === "VERIFIED" || report.status === "CLEANUP_COMPLETED") {
      entry.verified += 1;
    }
    byDate.set(report.reportDate, entry);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      reports: stats.reports,
      verified: stats.verified,
    }));
}
