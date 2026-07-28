export const BUG_REPORT_STATUS_OPTIONS = [
    "NEW",
    "IN_REVIEW",
    "IN_PROGRESS",
    "NEEDS_INFO",
    "FIXED",
    "CLOSED",
] as const;

export type BugReportStatus = (typeof BUG_REPORT_STATUS_OPTIONS)[number];

export const BUG_REPORT_STATUS_LABELS: Record<BugReportStatus, string> = {
    NEW: "New",
    IN_REVIEW: "In Review",
    IN_PROGRESS: "In Progress",
    NEEDS_INFO: "Needs Info",
    FIXED: "Fixed",
    CLOSED: "Closed",
};

export const BUG_REPORT_STATUS_BADGE_CLASS: Record<BugReportStatus, string> = {
    NEW: "border-sky-200 bg-sky-50 text-sky-700",
    IN_REVIEW: "border-violet-200 bg-violet-50 text-violet-700",
    IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-800",
    NEEDS_INFO: "border-rose-200 bg-rose-50 text-rose-700",
    FIXED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CLOSED: "border-slate-200 bg-slate-50 text-slate-700",
};

export function formatBugReportDuration(durationMs?: number | null) {
    if (!durationMs) return "0:00";
    const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

