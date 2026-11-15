import type { HotspotCluster, WasteReport } from "../types/plasticwatch";

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Computes the great-circle distance in meters between two WGS84 coordinates
 * using the Haversine formula.
 */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Transparent prototype priority score (0-100):
 * - 40%: Report count (saturates at 5 reports)
 * - 40%: Recurrence across distinct dates (saturates at 3 dates)
 * - 20%: Human verification ratio (verified / total reports in cluster)
 *
 * This is a relative review-priority score, NOT a proven environmental-risk measurement.
 */
export function calculateHotspotPriorityScore(
  reportCount: number,
  distinctDatesCount: number,
  verifiedCount: number,
): { priorityScore: number; countScore: number; recurrenceScore: number; verificationScore: number } {
  if (reportCount <= 0) {
    return { priorityScore: 0, countScore: 0, recurrenceScore: 0, verificationScore: 0 };
  }

  const countScore = Math.round(Math.min(reportCount / 5, 1) * 40 * 10) / 10;
  const recurrenceScore = Math.round(Math.min(distinctDatesCount / 3, 1) * 40 * 10) / 10;
  const verificationScore = Math.round((verifiedCount / reportCount) * 20 * 10) / 10;
  const priorityScore = Math.round(countScore + recurrenceScore + verificationScore);

  return {
    priorityScore,
    countScore,
    recurrenceScore,
    verificationScore,
  };
}

/**
 * Groups nearby non-rejected reports into Potential Hotspots using connected-component
 * clustering over pairwise Haversine distances within `radiusMeters`.
 */
export function clusterReportsIntoHotspots(
  reports: WasteReport[],
  radiusMeters = 50,
  minReports = 2,
): HotspotCluster[] {
  const safeRadius = Number.isFinite(radiusMeters) && radiusMeters > 0 ? radiusMeters : 50;
  const eligible = reports.filter((r) => r.status !== "REJECTED");
  const n = eligible.length;
  if (n < minReports) return [];

  const visited = new Array<boolean>(n).fill(false);
  const clusters: HotspotCluster[] = [];
  let clusterIndex = 1;

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;

    const queue: number[] = [i];
    visited[i] = true;
    const componentIndices: number[] = [];

    while (queue.length > 0) {
      const currentIdx = queue.shift()!;
      componentIndices.push(currentIdx);
      const current = eligible[currentIdx];

      for (let j = 0; j < n; j++) {
        if (visited[j]) continue;
        const candidate = eligible[j];
        const dist = haversineDistanceMeters(
          current.latitude,
          current.longitude,
          candidate.latitude,
          candidate.longitude,
        );
        if (dist <= safeRadius) {
          visited[j] = true;
          queue.push(j);
        }
      }
    }

    if (componentIndices.length >= minReports) {
      const members = componentIndices.map((idx) => eligible[idx]);
      const sumLat = members.reduce((acc, item) => acc + item.latitude, 0);
      const sumLng = members.reduce((acc, item) => acc + item.longitude, 0);
      const centerLat = Number((sumLat / members.length).toFixed(6));
      const centerLng = Number((sumLng / members.length).toFixed(6));

      const distinctDates = new Set(members.map((m) => m.reportDate));
      const verifiedCount = members.filter(
        (m) => m.status === "VERIFIED" || m.status === "CLEANUP_COMPLETED",
      ).length;

      const sortedDates = members.map((m) => m.reportDate).sort();
      const latestReportDate = sortedDates[sortedDates.length - 1] ?? "";

      const breakdown = calculateHotspotPriorityScore(
        members.length,
        distinctDates.size,
        verifiedCount,
      );

      const primaryLocation =
        members.find((m) => m.locationLabel.trim().length > 0)?.locationLabel ??
        `Zone ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}`;

      const sortedIds = members.map((m) => m.id).sort();
      const deterministicId = `HS-${clusterIndex.toString().padStart(2, "0")}-${sortedIds[0].slice(-4)}`;

      clusters.push({
        id: deterministicId,
        label: `Potential Hotspot · ${primaryLocation}`,
        centerLat,
        centerLng,
        radiusMeters: safeRadius,
        reportIds: members.map((m) => m.id),
        reportCount: members.length,
        distinctDatesCount: distinctDates.size,
        verifiedCount,
        latestReportDate,
        priorityScore: breakdown.priorityScore,
        scoreBreakdown: {
          countScore: breakdown.countScore,
          recurrenceScore: breakdown.recurrenceScore,
          verificationScore: breakdown.verificationScore,
        },
        containsOnlyDemoData: members.every((m) => m.isDemoData),
      });
      clusterIndex += 1;
    }
  }

  return clusters.sort((a, b) => b.priorityScore - a.priorityScore || b.reportCount - a.reportCount);
}
