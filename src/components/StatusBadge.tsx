import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { ReportStatus } from "../types/plasticwatch";
import { getStatusLabel } from "../utils/analytics";

interface StatusBadgeProps {
  status: ReportStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = getStatusLabel(status);

  switch (status) {
    case "VERIFIED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{label}</span>
        </span>
      );
    case "CLEANUP_COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-300 whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>{label}</span>
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-300 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>{label}</span>
        </span>
      );
    case "NEEDS_MORE_INFORMATION":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 whitespace-nowrap">
          <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{label}</span>
        </span>
      );
    case "AI_PROCESSING":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-300 whitespace-nowrap">
          <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
          <span>{label}</span>
        </span>
      );
    case "PENDING_REVIEW":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-200 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{label}</span>
        </span>
      );
    case "SUBMITTED":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-200 whitespace-nowrap">
          <AlertCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>{label}</span>
        </span>
      );
  }
}

export function DemoOriginTag({ isDemoData }: { isDemoData: boolean }) {
  if (!isDemoData) {
    return (
      <span className="text-[11px] font-medium text-emerald-400 whitespace-nowrap">
        Real Field Submission
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-amber-300 whitespace-nowrap">
      SIMULATED DEMO DATA — NOT REAL FIELD OBSERVATIONS
    </span>
  );
}
