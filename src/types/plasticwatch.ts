export type ReportStatus =
  | "SUBMITTED"
  | "AI_PROCESSING"
  | "PENDING_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "NEEDS_MORE_INFORMATION"
  | "CLEANUP_COMPLETED";

export type WasteCategory =
  | "Plastic bottles"
  | "Plastic bags"
  | "Plastic wrappers"
  | "Plastic containers"
  | "Other visible litter"
  | "Uncertain / not identifiable";

export type PlasticAssessment = "YES" | "NO" | "UNCERTAIN";
export type LevelScale = "LOW" | "MEDIUM" | "HIGH";
export type AiProcessingStatus = "IDLE" | "PROCESSING" | "COMPLETED" | "ERROR";
export type UserRoleMode = "CITIZEN" | "ADMIN";

export type AppPageId =
  | "overview"
  | "report"
  | "ai-analysis"
  | "gis-map"
  | "verification"
  | "cleanup"
  | "about";

export interface AiAnalysisResult {
  plasticPresent: PlasticAssessment;
  categories: WasteCategory[];
  visibleEvidence: string;
  quantityEstimate: LevelScale;
  suggestedPriority: LevelScale;
  explanation: string;
  limitations: string;
  modelName: string;
  analyzedAt: string;
}

export interface WasteReport {
  id: string;
  createdAt: string;
  reportDate: string; // YYYY-MM-DD
  latitude: number;
  longitude: number;
  locationLabel: string;
  description: string;
  imageDataUrl: string;
  mimeType: string;
  status: ReportStatus;
  isDemoData: boolean;
  aiStatus: AiProcessingStatus;
  aiResult: AiAnalysisResult | null;
  aiError: string | null;
  reviewNotes: string;
  reviewedAt: string | null;
  cleanupId: string | null;
}

export interface HotspotScoreBreakdown {
  countScore: number; // max 40
  recurrenceScore: number; // max 40
  verificationScore: number; // max 20
}

export interface HotspotCluster {
  id: string;
  label: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  reportIds: string[];
  reportCount: number;
  distinctDatesCount: number;
  verifiedCount: number;
  latestReportDate: string;
  priorityScore: number; // 0-100 relative review-priority score
  scoreBreakdown: HotspotScoreBreakdown;
  containsOnlyDemoData: boolean;
}

export type CleanupStatus = "PLANNED" | "COMPLETED";

export interface CleanupActivity {
  id: string;
  hotspotId: string;
  hotspotLabel: string;
  centerLat: number;
  centerLng: number;
  linkedReportIds: string[];
  scheduledDate: string; // YYYY-MM-DD
  organizerName: string;
  notes: string;
  beforePhotoDataUrl: string | null;
  afterPhotoDataUrl: string | null;
  measuredKg: number | null; // Strictly null unless explicitly entered by the user
  status: CleanupStatus;
  createdAt: string;
  completedAt: string | null;
  isDemoData: boolean;
}

export interface PlasticWatchBackup {
  exportedAt: string;
  appName: "PlasticWatch";
  storageNote: string;
  reports: WasteReport[];
  cleanups: CleanupActivity[];
}
