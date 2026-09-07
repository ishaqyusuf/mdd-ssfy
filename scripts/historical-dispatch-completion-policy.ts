import { createHash } from "node:crypto";

export const HISTORICAL_COMPLETION_POLICY = "completed-dispatch-missing-proof/v1";
export const HISTORICAL_COMPLETION_REASON =
  "Historical shortcut adoption: every completed dispatch missing delivery proof is an approved status-only completion; no operational evidence is manufactured.";

export type HistoricalDispatch = {
  id: number;
  status: string | null;
  meta: unknown;
  createdAt: Date | string | null;
  deliveredAt: Date | string | null;
  deletedAt: Date | string | null;
  updatedAt?: Date | string | null;
};
export type HistoricalCompletionSource = {
  id: number;
  status: string | null;
  deletedAt: Date | string | null;
  deliveries: HistoricalDispatch[];
  completionRecords: Array<{
    milestone: string;
    state: string;
    cancelledAt?: Date | string | null;
  }>;
};
const normalized = (value: string | null) => value?.trim().toLowerCase() ?? "";
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
export function isHistoricalShortcutDispatch(dispatch: HistoricalDispatch) {
  return !dispatch.deletedAt && normalized(dispatch.status) === "completed" &&
    object(object(dispatch.meta).dispatchCompletion).status !== "completed";
}

export function classifyHistoricalCompletion(source: HistoricalCompletionSource) {
  const dispatches = source.deliveries.filter(isHistoricalShortcutDispatch)
    .sort((a, b) => a.id - b.id);
  const held = (reason: string) => ({ eligible: false, reason, dispatchIds: dispatches.map(d => d.id), effectiveAt: null });
  if (!dispatches.length) return held("NO_COMPLETED_DISPATCH_MISSING_PROOF");
  if (source.deletedAt || ["cancelled", "canceled", "void", "voided"].includes(normalized(source.status)))
    return held("ORDER_CANCELLED_OR_DELETED");
  const completions = source.completionRecords.filter(c => c.milestone === "FULFILLMENT_COMPLETED");
  if (completions.some(c => c.state === "ACTIVE")) return held("ALREADY_COMPLETED");
  const candidateTimes = dispatches.map(d => d.deliveredAt)
    .map(d => d ? new Date(d).getTime() : NaN);
  const latestCandidateTime = candidateTimes.every(Number.isFinite) ? Math.max(...candidateTimes) : null;
  if (completions.some(c => c.state === "CANCELLED" &&
    (!c.cancelledAt || latestCandidateTime === null || !Number.isFinite(new Date(c.cancelledAt).getTime()) || new Date(c.cancelledAt).getTime() >= latestCandidateTime)))
    return held("COMPLETION_PREVIOUSLY_CANCELLED");
  const latest = dispatches.at(-1)!;
  // Dispatch ids are monotonic. A newer non-completed dispatch represents
  // subsequent work/cancellation and must not be closed by an older decision.
  if (source.deliveries.some(d => !d.deletedAt && d.id > latest.id && normalized(d.status) !== "completed"))
    return held("LATER_DISPATCH_REOPENED_OR_CANCELLED");
  const knownDates = dispatches.map(d => d.deliveredAt)
    .filter((d): d is Date | string => d !== null)
    .map(d => new Date(d).getTime()).filter(Number.isFinite);
  return {
    eligible: true,
    reason: "HISTORICAL_SHORTCUT",
    dispatchIds: dispatches.map(d => d.id),
    effectiveAt: knownDates.length ? new Date(Math.max(...knownDates)).toISOString() : null,
  };
}
export function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export function migrationRequestId(target: string, batchId: string, salesOrderId: number, action = "import") {
  const h = digest([HISTORICAL_COMPLETION_POLICY, target, batchId, salesOrderId, action]);
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
}
export function databaseTarget(databaseUrl: string, environment: string) {
  const url = new URL(databaseUrl);
  if (url.protocol !== "mysql:") throw new Error("A MySQL target is required");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (environment === "local" && !local) throw new Error("Local mode refuses a hosted database");
  if (environment === "production" && local) throw new Error("Production mode refuses a local database");
  if (!["local", "production"].includes(environment)) throw new Error("Choose local or production");
  const identity = `${url.hostname}:${url.port || "3306"}${url.pathname}`;
  return { environment: environment as "local" | "production", identity, fingerprint: digest(identity) };
}
