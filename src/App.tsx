import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Camera,
  CheckSquare,
  ClipboardCheck,
  Info,
  Map as MapIcon,
  Menu,
  Recycle,
  Shield,
  Sparkles,
  User,
  X,
} from "lucide-react";
import type {
  AppPageId,
  CleanupActivity,
  ReportStatus,
  UserRoleMode,
  WasteReport,
} from "./types/plasticwatch";
import {
  clearAllPersistedData,
  loadPersistedState,
  saveCleanups,
  saveClusterRadius,
  saveReports,
} from "./utils/storage";
import { createSimulatedDemoData } from "./utils/demoData";
import { clusterReportsIntoHotspots } from "./utils/hotspot";
import { OverviewDashboard } from "./components/OverviewDashboard";
import { ReportWastePage } from "./components/ReportWastePage";
import { AiAnalysisPage } from "./components/AiAnalysisPage";
import { GisHotspotMapPage } from "./components/GisHotspotMapPage";
import { VerificationPage } from "./components/VerificationPage";
import { CleanupTrackingPage } from "./components/CleanupTrackingPage";
import { AboutPage } from "./components/AboutPage";

const NAV_ITEMS: Array<{ id: AppPageId; label: string; icon: typeof BarChart3 }> = [
  { id: "overview", label: "Overview Dashboard", icon: BarChart3 },
  { id: "report", label: "Report Plastic Waste", icon: Camera },
  { id: "ai-analysis", label: "AI Image Analysis", icon: Sparkles },
  { id: "gis-map", label: "GIS Hotspot Map", icon: MapIcon },
  { id: "verification", label: "Reports & Verification", icon: CheckSquare },
  { id: "cleanup", label: "Cleanup Tracking", icon: ClipboardCheck },
  { id: "about", label: "About Project", icon: Info },
];

function generateReportId(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PW-${datePart}-${randomPart}`;
}

export default function App() {
  const [activePage, setActivePage] = useState<AppPageId>("overview");
  const [roleMode, setRoleMode] = useState<UserRoleMode>("CITIZEN");
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [cleanups, setCleanups] = useState<CleanupActivity[]>([]);
  const [clusterRadiusMeters, setClusterRadiusMeters] = useState<number>(50);
  const [storageBackend, setStorageBackend] = useState<"IndexedDB" | "localStorage">("IndexedDB");
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedAiReportId, setSelectedAiReportId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadPersistedState().then((state) => {
      if (!mounted) return;
      setReports(state.reports);
      setCleanups(state.cleanups);
      setClusterRadiusMeters(state.clusterRadiusMeters);
      setStorageBackend(state.storageBackend);
      setIsLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const hotspots = useMemo(
    () => clusterReportsIntoHotspots(reports, clusterRadiusMeters, 2),
    [reports, clusterRadiusMeters],
  );

  const navigateTo = (page: AppPageId, reportId?: string) => {
    if (reportId) {
      setSelectedAiReportId(reportId);
    }
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  const runGeminiAnalysisForReport = async (targetReport: WasteReport): Promise<WasteReport> => {
    // Set AI_PROCESSING state immediately
    setReports((prev) => {
      const updated = prev.map((r) =>
        r.id === targetReport.id
          ? {
              ...r,
              status: r.status === "SUBMITTED" ? ("AI_PROCESSING" as ReportStatus) : r.status,
              aiStatus: "PROCESSING" as const,
              aiError: null,
            }
          : r,
      );
      void saveReports(updated);
      return updated;
    });

    try {
      let imageBase64 = targetReport.imageDataUrl;
      let mimeType = targetReport.mimeType || "image/jpeg";

      // If imageDataUrl is a static path (e.g., demo record), fetch & encode it first
      if (!imageBase64.startsWith("data:")) {
        const resImg = await fetch(imageBase64);
        const blob = await resImg.blob();
        mimeType = blob.type || "image/jpeg";
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Failed to encode image for AI analysis."));
          reader.readAsDataURL(blob);
        });
      }

      const response = await fetch("/api/analyze-waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          description: targetReport.description,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.details || payload?.error || `Server error ${response.status}`);
      }

      const analyzedReport: WasteReport = {
        ...targetReport,
        status:
          targetReport.status === "SUBMITTED" || targetReport.status === "AI_PROCESSING"
            ? "PENDING_REVIEW"
            : targetReport.status,
        aiStatus: "COMPLETED",
        aiResult: payload,
        aiError: null,
      };

      setReports((prev) => {
        const updated = prev.map((r) => (r.id === targetReport.id ? analyzedReport : r));
        void saveReports(updated);
        return updated;
      });
      return analyzedReport;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to run Gemini AI analysis.";
      const failedReport: WasteReport = {
        ...targetReport,
        status: targetReport.status === "AI_PROCESSING" ? "SUBMITTED" : targetReport.status,
        aiStatus: "ERROR",
        aiError: errMsg,
      };
      setReports((prev) => {
        const updated = prev.map((r) => (r.id === targetReport.id ? failedReport : r));
        void saveReports(updated);
        return updated;
      });
      return failedReport;
    }
  };

  const handleSubmitReport = async (draft: {
    latitude: number;
    longitude: number;
    locationLabel: string;
    description: string;
    imageDataUrl: string;
    mimeType: string;
  }): Promise<WasteReport> => {
    const nowIso = new Date().toISOString();
    const newReport: WasteReport = {
      id: generateReportId(),
      createdAt: nowIso,
      reportDate: nowIso.slice(0, 10),
      latitude: draft.latitude,
      longitude: draft.longitude,
      locationLabel: draft.locationLabel,
      description: draft.description,
      imageDataUrl: draft.imageDataUrl,
      mimeType: draft.mimeType,
      status: "SUBMITTED",
      isDemoData: false,
      aiStatus: "IDLE",
      aiResult: null,
      aiError: null,
      reviewNotes: "",
      reviewedAt: null,
      cleanupId: null,
    };

    const nextReports = [newReport, ...reports];
    setReports(nextReports);
    await saveReports(nextReports);
    setSelectedAiReportId(newReport.id);

    // Run real server-side Gemini analysis
    return runGeminiAnalysisForReport(newReport);
  };

  const handleRetryAnalysis = async (reportId: string) => {
    const target = reports.find((r) => r.id === reportId);
    if (!target) return;
    await runGeminiAnalysisForReport(target);
  };

  const handleUpdateReportReview = async (
    reportId: string,
    status: ReportStatus,
    reviewNotes: string,
  ) => {
    const updated = reports.map((r) =>
      r.id === reportId
        ? {
            ...r,
            status,
            reviewNotes,
            reviewedAt: new Date().toISOString(),
          }
        : r,
    );
    setReports(updated);
    await saveReports(updated);
  };

  const handleCreateCleanup = async (input: {
    hotspot: (typeof hotspots)[number];
    scheduledDate: string;
    organizerName: string;
    notes: string;
    beforePhotoDataUrl: string | null;
    afterPhotoDataUrl: string | null;
    measuredKg: number | null;
    markCompletedImmediately: boolean;
  }) => {
    const cleanupId = `CLN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
      .toString(36)
      .substring(2, 5)
      .toUpperCase()}`;

    const newCleanup: CleanupActivity = {
      id: cleanupId,
      hotspotId: input.hotspot.id,
      hotspotLabel: input.hotspot.label,
      centerLat: input.hotspot.centerLat,
      centerLng: input.hotspot.centerLng,
      linkedReportIds: input.hotspot.reportIds,
      scheduledDate: input.scheduledDate,
      organizerName: input.organizerName,
      notes: input.notes,
      beforePhotoDataUrl: input.beforePhotoDataUrl,
      afterPhotoDataUrl: input.afterPhotoDataUrl,
      measuredKg: input.measuredKg,
      status: input.markCompletedImmediately ? "COMPLETED" : "PLANNED",
      createdAt: new Date().toISOString(),
      completedAt: input.markCompletedImmediately ? new Date().toISOString() : null,
      isDemoData: input.hotspot.containsOnlyDemoData,
    };

    const nextCleanups = [newCleanup, ...cleanups];
    setCleanups(nextCleanups);
    await saveCleanups(nextCleanups);

    if (input.markCompletedImmediately) {
      const linkedSet = new Set(input.hotspot.reportIds);
      const nextReports = reports.map((r) =>
        linkedSet.has(r.id)
          ? { ...r, status: "CLEANUP_COMPLETED" as ReportStatus, cleanupId }
          : r,
      );
      setReports(nextReports);
      await saveReports(nextReports);
    }
  };

  const handleMarkCleanupCompleted = async (cleanupId: string) => {
    const target = cleanups.find((c) => c.id === cleanupId);
    if (!target) return;

    const nextCleanups = cleanups.map((c) =>
      c.id === cleanupId
        ? { ...c, status: "COMPLETED" as const, completedAt: new Date().toISOString() }
        : c,
    );
    setCleanups(nextCleanups);
    await saveCleanups(nextCleanups);

    const linkedSet = new Set(target.linkedReportIds);
    const nextReports = reports.map((r) =>
      linkedSet.has(r.id)
        ? { ...r, status: "CLEANUP_COMPLETED" as ReportStatus, cleanupId }
        : r,
    );
    setReports(nextReports);
    await saveReports(nextReports);
  };

  const handleLoadDemoData = async () => {
    const demo = createSimulatedDemoData();
    const existingIds = new Set(reports.map((r) => r.id));
    const existingCleanupIds = new Set(cleanups.map((c) => c.id));

    const mergedReports = [
      ...reports,
      ...demo.reports.filter((r) => !existingIds.has(r.id)),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const mergedCleanups = [
      ...cleanups,
      ...demo.cleanups.filter((c) => !existingCleanupIds.has(c.id)),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    setReports(mergedReports);
    setCleanups(mergedCleanups);
    await Promise.all([saveReports(mergedReports), saveCleanups(mergedCleanups)]);
  };

  const handleResetAllData = async () => {
    await clearAllPersistedData();
    setReports([]);
    setCleanups([]);
    setSelectedAiReportId(null);
  };

  const handleChangeRadius = (radius: number) => {
    setClusterRadiusMeters(radius);
    saveClusterRadius(radius);
  };

  return (
    <div className="min-h-screen bg-[#0A110E] text-[#F4F7F5] flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between border-b border-[#1F3329] bg-[#111B16] px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
            <Recycle className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display text-sm font-bold tracking-tight text-white leading-none">
              PlasticWatch
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5">Detect. Map. Act.</div>
          </div>
        </div>
        <button
          type="button"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="rounded-lg border border-[#264034] bg-[#16241D] p-2 text-[#CBD5E1] hover:text-white cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? "block" : "hidden"
        } lg:block lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-[#1F3329] bg-[#111B16] flex flex-col justify-between`}
      >
        <div className="p-5 space-y-6">
          {/* Desktop Brand Lockup */}
          <div className="hidden lg:flex items-center gap-3 pb-4 border-b border-[#1F3329]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shrink-0">
              <Recycle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display text-base font-bold tracking-tight text-white leading-tight">
                PlasticWatch
              </div>
              <div className="text-xs text-emerald-400 font-medium">Detect. Map. Act.</div>
            </div>
          </div>

          {/* Demo Access Mode Switch */}
          <div className="rounded-xl border border-[#1F3329] bg-[#0E1713] p-3 space-y-2">
            <div className="text-[10px] font-mono font-semibold text-amber-300 leading-snug">
              DEMO ACCESS — NOT PRODUCTION AUTHENTICATION
            </div>
            <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-[#14221B] p-1">
              <button
                type="button"
                onClick={() => setRoleMode("CITIZEN")}
                className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  roleMode === "CITIZEN"
                    ? "bg-emerald-500 text-[#05110B] font-semibold"
                    : "text-[#9FB0A6] hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>Citizen View</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleMode("ADMIN")}
                className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  roleMode === "ADMIN"
                    ? "bg-amber-400 text-[#111B16] font-semibold"
                    : "text-[#9FB0A6] hover:text-white"
                }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Admin View</span>
              </button>
            </div>
          </div>

          {/* 7 Navigation Pages */}
          <nav aria-label="Primary navigation" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35"
                      : "text-[#9FB0A6] hover:bg-[#16241D] hover:text-white border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-400" : "text-[#6E8277]"}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-5 border-t border-[#1F3329] text-[11px] text-[#6E8277] space-y-1">
          <div className="font-medium text-[#9FB0A6]">AJIET Mangalore Demo</div>
          <div>Local {storageBackend} · {reports.length} report(s)</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {!isLoaded ? (
          <div className="rounded-xl border border-[#1F3329] bg-[#111B16] p-8 text-sm text-[#9FB0A6]">
            Loading local PlasticWatch records...
          </div>
        ) : (
          <>
            {activePage === "overview" && (
              <OverviewDashboard
                reports={reports}
                hotspots={hotspots}
                cleanups={cleanups}
                storageBackend={storageBackend}
                onNavigate={navigateTo}
                onLoadDemoData={handleLoadDemoData}
                onResetAllData={handleResetAllData}
              />
            )}

            {activePage === "report" && (
              <ReportWastePage
                existingReports={reports}
                onSubmitReport={handleSubmitReport}
                onNavigate={navigateTo}
              />
            )}

            {activePage === "ai-analysis" && (
              <AiAnalysisPage
                reports={reports}
                selectedReportId={selectedAiReportId}
                onSelectReportId={setSelectedAiReportId}
                onRetryAnalysis={handleRetryAnalysis}
                onNavigate={navigateTo}
              />
            )}

            {activePage === "gis-map" && (
              <GisHotspotMapPage
                reports={reports}
                clusterRadiusMeters={clusterRadiusMeters}
                onChangeClusterRadius={handleChangeRadius}
              />
            )}

            {activePage === "verification" && (
              <VerificationPage
                reports={reports}
                roleMode={roleMode}
                onSwitchToAdmin={() => setRoleMode("ADMIN")}
                onUpdateReportReview={handleUpdateReportReview}
              />
            )}

            {activePage === "cleanup" && (
              <CleanupTrackingPage
                hotspots={hotspots}
                cleanups={cleanups}
                roleMode={roleMode}
                onSwitchToAdmin={() => setRoleMode("ADMIN")}
                onCreateCleanup={handleCreateCleanup}
                onMarkCleanupCompleted={handleMarkCleanupCompleted}
              />
            )}

            {activePage === "about" && <AboutPage />}
          </>
        )}
      </main>
    </div>
  );
}
