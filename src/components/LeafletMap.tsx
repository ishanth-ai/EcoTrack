import { useEffect, useRef } from "react";
import L from "leaflet";
import type { HotspotCluster, WasteReport } from "../types/plasticwatch";
import { getStatusColor, getStatusLabel } from "../utils/analytics";
import { AJIET_MAP_CENTER } from "../utils/demoData";

interface LeafletMapProps {
  reports?: WasteReport[];
  hotspots?: HotspotCluster[];
  selectedLocation?: { lat: number; lng: number } | null;
  pickMode?: boolean;
  onSelectLocation?: (lat: number, lng: number) => void;
  onSelectReport?: (report: WasteReport) => void;
  focusCenter?: [number, number] | null;
  heightClass?: string;
  testId?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function LeafletMap({
  reports = [],
  hotspots = [],
  selectedLocation = null,
  pickMode = false,
  onSelectLocation,
  onSelectReport,
  focusCenter = null,
  heightClass = "h-[460px]",
  testId = "leaflet-map",
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const pickMarkerRef = useRef<L.CircleMarker | null>(null);
  const onSelectLocationRef = useRef(onSelectLocation);
  const onSelectReportRef = useRef(onSelectReport);
  const pickModeRef = useRef(pickMode);

  onSelectLocationRef.current = onSelectLocation;
  onSelectReportRef.current = onSelectReport;
  pickModeRef.current = pickMode;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: focusCenter ?? AJIET_MAP_CENTER,
      zoom: 16,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    layersRef.current = group;
    mapRef.current = map;

    map.on("click", (ev: L.LeafletMouseEvent) => {
      if (pickModeRef.current && onSelectLocationRef.current) {
        onSelectLocationRef.current(
          Number(ev.latlng.lat.toFixed(6)),
          Number(ev.latlng.lng.toFixed(6)),
        );
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
      pickMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (focusCenter) {
      map.setView(focusCenter, Math.max(map.getZoom(), 16), { animate: true });
    }
  }, [focusCenter]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layersRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Render Potential Hotspot clusters first (underneath individual markers)
    for (const hs of hotspots) {
      const circle = L.circle([hs.centerLat, hs.centerLng], {
        radius: hs.radiusMeters,
        color: "#F59E0B",
        weight: 2,
        dashArray: "6 4",
        fillColor: "#F59E0B",
        fillOpacity: 0.16,
      });

      const popupHtml = `
        <div style="min-width:220px;font-size:12px;line-height:1.45;">
          <div style="font-weight:700;color:#FBBF24;margin-bottom:4px;">${escapeHtml(hs.label)}</div>
          <div style="color:#CBD5E1;">Reports: <strong style="color:#F8FAFC;">${hs.reportCount}</strong> · Dates: <strong style="color:#F8FAFC;">${hs.distinctDatesCount}</strong> · Verified: <strong style="color:#34D399;">${hs.verifiedCount}</strong></div>
          <div style="color:#CBD5E1;margin-top:2px;">Latest date: ${escapeHtml(hs.latestReportDate)} · Radius: ${hs.radiusMeters}m</div>
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid #1F3329;color:#FDE68A;">
            Review-Priority Score: <strong>${hs.priorityScore}/100</strong>
            <div style="font-size:11px;color:#94A3B8;margin-top:2px;">Relative review-priority score only; requires human inspection.</div>
          </div>
          ${hs.containsOnlyDemoData ? '<div style="margin-top:4px;font-size:10px;color:#FBBF24;">SIMULATED DEMO DATA — NOT REAL FIELD OBSERVATIONS</div>' : ""}
        </div>
      `;
      circle.bindPopup(popupHtml);
      circle.addTo(group);
    }

    // Render individual report markers colored by status
    for (const report of reports) {
      const color = getStatusColor(report.status);
      const marker = L.circleMarker([report.latitude, report.longitude], {
        radius: 8,
        color: "#0A110E",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.92,
      });

      const categoryText =
        report.aiResult?.categories?.join(", ") || "Pending AI classification";
      const statusText = getStatusLabel(report.status);

      const popupHtml = `
        <div style="min-width:210px;font-size:12px;line-height:1.45;">
          <div style="font-weight:700;color:#F8FAFC;">${escapeHtml(report.id)}</div>
          <div style="color:#9FB0A6;margin-bottom:4px;">${escapeHtml(report.locationLabel || "Selected location")}</div>
          <div>Status: <strong style="color:${color};">${escapeHtml(statusText)}</strong></div>
          <div>Category: <span style="color:#E2E8F0;">${escapeHtml(categoryText)}</span></div>
          <div style="font-family:monospace;font-size:11px;color:#94A3B8;margin-top:4px;">
            ${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}
          </div>
          ${
            report.isDemoData
              ? '<div style="margin-top:4px;font-size:10px;color:#FBBF24;">SIMULATED DEMO DATA — NOT REAL FIELD OBSERVATIONS</div>'
              : ""
          }
        </div>
      `;
      marker.bindPopup(popupHtml);
      marker.on("click", () => {
        if (onSelectReportRef.current) {
          onSelectReportRef.current(report);
        }
      });
      marker.addTo(group);
    }
  }, [reports, hotspots]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pickMarkerRef.current) {
      pickMarkerRef.current.remove();
      pickMarkerRef.current = null;
    }

    if (selectedLocation) {
      const marker = L.circleMarker([selectedLocation.lat, selectedLocation.lng], {
        radius: 10,
        color: "#FFFFFF",
        weight: 2.5,
        fillColor: "#10B981",
        fillOpacity: 0.95,
      }).addTo(map);
      marker.bindTooltip(
        `Selected: ${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`,
        { permanent: false, direction: "top" },
      );
      pickMarkerRef.current = marker;
    }
  }, [selectedLocation]);

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      className={`w-full ${heightClass} rounded-xl overflow-hidden border border-[#1F3329] bg-[#0E1713] ${
        pickMode ? "cursor-crosshair" : ""
      }`}
    />
  );
}
