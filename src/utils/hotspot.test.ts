import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateHotspotPriorityScore,
  clusterReportsIntoHotspots,
  haversineDistanceMeters,
} from "./hotspot";
import {
  computeDashboardSummary,
  computeReportsByCategory,
  computeReportsOverTime,
  computeStatusDistribution,
} from "./analytics";
import { reportsToCsv } from "./export";
import type { CleanupActivity, WasteReport } from "../types/plasticwatch";

function makeReport(overrides: Partial<WasteReport>): WasteReport {
  return {
    id: "PW-TEST-1",
    createdAt: "2026-11-14T10:00:00.000Z",
    reportDate: "2026-11-14",
    latitude: 12.9095,
    longitude: 74.8385,
    locationLabel: "Test Point",
    description: "",
    imageDataUrl: "data:image/jpeg;base64,abc",
    mimeType: "image/jpeg",
    status: "PENDING_REVIEW",
    isDemoData: false,
    aiStatus: "COMPLETED",
    aiResult: {
      plasticPresent: "YES",
      categories: ["Plastic bottles"],
      visibleEvidence: "Bottles visible",
      quantityEstimate: "MEDIUM",
      suggestedPriority: "MEDIUM",
      explanation: "Bottles on ground",
      limitations: "Visual assessment only",
      modelName: "gemini-4-hydrogen",
      analyzedAt: "2026-11-14T10:00:10.000Z",
    },
    aiError: null,
    reviewNotes: "",
    reviewedAt: null,
    cleanupId: null,
    ...overrides,
  };
}

test("haversineDistanceMeters computes zero for identical points and ~28m for close points", () => {
  assert.equal(haversineDistanceMeters(12.9095, 74.8385, 12.9095, 74.8385), 0);
  const d = haversineDistanceMeters(12.9095, 74.8385, 12.9097, 74.83865);
  assert.ok(d > 20 && d < 35, `Expected ~27m, got ${d}`);
});

test("clusterReportsIntoHotspots groups reports within 50m and excludes rejected reports", () => {
  const reports: WasteReport[] = [
    makeReport({ id: "R1", latitude: 12.9095, longitude: 74.8385, reportDate: "2026-11-10", status: "VERIFIED" }),
    makeReport({ id: "R2", latitude: 12.90965, longitude: 74.8386, reportDate: "2026-11-12", status: "PENDING_REVIEW" }),
    makeReport({ id: "R3", latitude: 12.9096, longitude: 74.83855, reportDate: "2026-11-12", status: "REJECTED" }),
    makeReport({ id: "R4", latitude: 12.915, longitude: 74.845, reportDate: "2026-11-14", status: "VERIFIED" }),
  ];

  const hotspots = clusterReportsIntoHotspots(reports, 50, 2);
  assert.equal(hotspots.length, 1);
  assert.equal(hotspots[0].reportCount, 2);
  assert.equal(hotspots[0].distinctDatesCount, 2);
  assert.equal(hotspots[0].verifiedCount, 1);
  assert.equal(hotspots[0].latestReportDate, "2026-11-12");
});

test("calculateHotspotPriorityScore matches 40/40/20 weighted formula", () => {
  // 5 reports (40), 3 distinct dates (40), 5/5 verified (20) -> 100
  const max = calculateHotspotPriorityScore(5, 3, 5);
  assert.equal(max.priorityScore, 100);

  // 2 reports (16), 2 dates (26.7), 1 verified (10) -> 53
  const partial = calculateHotspotPriorityScore(2, 2, 1);
  assert.equal(partial.countScore, 16);
  assert.equal(partial.verificationScore, 10);
  assert.equal(partial.priorityScore, 53);
});

test("analytics computes counts and time series accurately from saved data", () => {
  const reports: WasteReport[] = [
    makeReport({ id: "R1", reportDate: "2026-11-10", status: "VERIFIED" }),
    makeReport({ id: "R2", reportDate: "2026-11-12", status: "PENDING_REVIEW", isDemoData: true }),
  ];
  const hotspots = clusterReportsIntoHotspots(reports, 50, 2);
  const cleanups: CleanupActivity[] = [
    {
      id: "C1",
      hotspotId: hotspots[0].id,
      hotspotLabel: hotspots[0].label,
      centerLat: 12.9095,
      centerLng: 74.8385,
      linkedReportIds: ["R1"],
      scheduledDate: "2026-11-14",
      organizerName: "Eco Club",
      notes: "",
      beforePhotoDataUrl: null,
      afterPhotoDataUrl: null,
      measuredKg: null,
      status: "COMPLETED",
      createdAt: "2026-11-14T08:00:00.000Z",
      completedAt: "2026-11-14T11:00:00.000Z",
      isDemoData: false,
    },
  ];

  const summary = computeDashboardSummary(reports, hotspots, cleanups);
  assert.equal(summary.totalReports, 2);
  assert.equal(summary.awaitingVerification, 1);
  assert.equal(summary.verifiedReports, 1);
  assert.equal(summary.potentialHotspots, 1);
  assert.equal(summary.completedCleanups, 1);

  const byCat = computeReportsByCategory(reports);
  assert.equal(byCat.find((c) => c.category === "Plastic bottles")?.count, 2);

  const overTime = computeReportsOverTime(reports);
  assert.equal(overTime.length, 2);
  assert.equal(overTime[0].date, "2026-11-10");

  const statusDist = computeStatusDistribution(reports);
  assert.equal(statusDist.length, 2);
});

test("reportsToCsv properly escapes quotes and marks simulated demo data", () => {
  const reports: WasteReport[] = [
    makeReport({
      id: "PW-1",
      description: 'Near "gate 2", drain',
      isDemoData: true,
    }),
  ];
  const csv = reportsToCsv(reports);
  assert.ok(csv.includes('"Near ""gate 2"", drain"'));
  assert.ok(csv.includes("SIMULATED DEMO DATA — NOT REAL FIELD OBSERVATIONS"));
});
