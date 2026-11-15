import { useMemo, useState } from "react";
import { Filter, Layers, MapPin } from "lucide-react";
import type { HotspotCluster, ReportStatus, WasteCategory, WasteReport } from "../types/plasticwatch";
import { LeafletMap } from "./LeafletMap";
import { clusterReportsIntoHotspots } from "../utils/hotspot";
import { getStatusColor, getStatusLabel } from "../utils/analytics";

interface GisHotspotMapPageProps {
  reports: WasteReport[];
  clusterRadiusMeters: number;
  onChangeClusterRadius: (radius: number) => void;
}

const ALL_STATUSES: ReportStatus[] = [
  "SUBMITTED",
  "AI_PROCESSING",
  "PENDING_REVIEW",
  "VERIFIED",
  "NEEDS_MORE_INFORMATION",
  "REJECTED",
  "CLEANUP_COMPLETED",
];

const ALL_CATEGORIES: WasteCategory[] = [
  "Plastic bottles",
  "Plastic bags",
  "Plastic wrappers",
  "Plastic containers",
  "Other visible litter",
  "Uncertain / not identifiable",
];

export function GisHotspotMapPage({
  reports,
  clusterRadiusMeters,
  onChangeClusterRadius,
}: GisHotspotMapPageProps) {
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [focusCenter, setFocusCenter] = useState<[number, number] | null>(null);

  const availableDates = useMemo(() => {
    const dates = new Set(reports.map((r) => r.reportDate));
    return Array.from(dates).sort().reverse();
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (dateFilter !== "ALL" && r.reportDate !== dateFilter) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (categoryFilter !== "ALL") {
        const cats = r.aiResult?.categories ?? ["Uncertain / not identifiable"];
        if (!cats.includes(categoryFilter as WasteCategory)) return false;
      }
      return true;
    });
  }, [reports, dateFilter, statusFilter, categoryFilter]);

  const filteredHotspots: HotspotCluster[] = useMemo(() => {
    return clusterReportsIntoHotspots(filteredReports, clusterRadiusMeters, 2);
  }, [filteredReports, clusterRadiusMeters]);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#1F3329] pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          GIS Hotspot Map
        </h1>
        <p className="mt-1 text-sm text-[#9FB0A6]">
          Interactive OpenStreetMap view with Haversine clustering (min 2 reports within configurable radius). Areas are labeled &ldquo;Potential Hotspot&rdquo; until inspected by a human.
        </p>
      </div>

      {/* Filters & Radius Config Bar */}
      <div className="rounded-xl border border-[#1F3329] bg-[#111B16] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label htmlFor="map-date-filter" className="block text-xs font-medium text-[#9FB0A6] mb-1.5">
            Filter by Date
          </label>
          <select
            id="map-date-filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full rounded-lg border border-[#264034] bg-[#0E1713] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Dates ({reports.length})</option>
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="map-category-filter" className="block text-xs font-medium text-[#9FB0A6] mb-1.5">
            Filter by Category
          </label>
          <select
            id="map-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-lg border border-[#264034] bg-[#0E1713] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="map-status-filter" className="block text-xs font-medium text-[#9FB0A6] mb-1.5">
            Verification Status
          </label>
          <select
            id="map-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-[#264034] bg-[#0E1713] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {getStatusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-medium text-[#9FB0A6] mb-1.5">
            <label htmlFor="radius-range">Haversine Cluster Radius</label>
            <span className="font-mono text-emerald-400">{clusterRadiusMeters} m</span>
          </div>
          <input
            id="radius-range"
            type="range"
            min={20}
            max={250}
            step={10}
            value={clusterRadiusMeters}
            onChange={(e) => onChangeClusterRadius(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Main Map + Hotspot Cluster List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-3">
          <LeafletMap
            reports={filteredReports}
            hotspots={filteredHotspots}
            focusCenter={focusCenter}
            heightClass="h-[520px]"
            testId="gis-hotspot-map"
          />

          {/* Compact Status Marker Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[#1F3329] bg-[#111B16] px-4 py-2.5 text-xs text-[#CBD5E1]">
            <span className="font-medium text-[#9FB0A6] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              <span>Marker Legend:</span>
            </span>
            {ALL_STATUSES.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getStatusColor(s) }}
                />
                <span>{getStatusLabel(s)}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-amber-300">
              <span className="inline-block w-3 h-3 rounded-full border border-dashed border-amber-400 bg-amber-400/20" />
              <span>Potential Hotspot ({clusterRadiusMeters}m)</span>
            </span>
          </div>
        </div>

        {/* Right Panel: Detected Potential Hotspots */}
        <div className="lg:col-span-4 rounded-xl border border-[#1F3329] bg-[#111B16] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1F3329] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-white">
                Potential Hotspots ({filteredHotspots.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-[#9FB0A6]">Min 2 reports</span>
          </div>

          <p className="text-xs text-[#9FB0A6] leading-relaxed">
            Prototype Review-Priority Score = Report Count (40%) + Recurrence Across Dates (40%) + Human Verification Ratio (20%). This is a relative review-priority score, not a proven environmental-risk measurement.
          </p>

          {filteredHotspots.length === 0 ? (
            <div className="rounded-lg border border-[#1F3329] bg-[#0E1713] p-5 text-center text-xs text-[#9FB0A6]">
              No potential hotspots detected within {clusterRadiusMeters}m for the current filters. Clusters form automatically when 2 or more non-rejected reports fall within {clusterRadiusMeters}m.
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {filteredHotspots.map((hs) => (
                <div
                  key={hs.id}
                  className="rounded-lg border border-[#1F3329] bg-[#0E1713] p-3.5 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold text-white leading-snug">
                      {hs.label}
                    </div>
                    <span className="font-mono text-sm font-semibold text-amber-300 whitespace-nowrap">
                      {hs.priorityScore}/100
                    </span>
                  </div>

                  <div className="text-xs text-[#9FB0A6] flex flex-wrap gap-x-2 gap-y-1 font-mono">
                    <span>{hs.reportCount} reports</span>
                    <span>·</span>
                    <span>{hs.distinctDatesCount} dates</span>
                    <span>·</span>
                    <span className="text-emerald-400">{hs.verifiedCount} verified</span>
                  </div>

                  <div className="text-[11px] text-[#6E8277]">
                    Latest: {hs.latestReportDate} · Breakdown: {hs.scoreBreakdown.countScore} +{" "}
                    {hs.scoreBreakdown.recurrenceScore} + {hs.scoreBreakdown.verificationScore}
                  </div>

                  {hs.containsOnlyDemoData && (
                    <div className="text-[10px] font-medium text-amber-300">
                      SIMULATED DEMO DATA — NOT REAL FIELD OBSERVATIONS
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setFocusCenter([hs.centerLat, hs.centerLng])}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer pt-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Center Map on Cluster</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
