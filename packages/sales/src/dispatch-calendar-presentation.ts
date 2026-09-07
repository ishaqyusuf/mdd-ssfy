import { getSalesPipelineFulfillmentStateLabel, isSalesPipelineFulfillmentCompleted, type SalesPipelineSnapshot } from "./sales-pipeline";

type FulfillmentState = SalesPipelineSnapshot["fulfillment"]["state"] | null | undefined;
export type DispatchCalendarTone = "completed" | "conflict" | "unknown" | "cancelled" | "queued" | "in_progress" | "ready";

export function getDispatchCalendarPresentation(state: FulfillmentState, operationalStage: string): {
	tone: DispatchCalendarTone; label: string; completed: boolean;
} {
	if (operationalStage === "cancelled") return { tone: "cancelled", label: "Cancelled", completed: false };
	const resolved = state || "unknown";
	const label = getSalesPipelineFulfillmentStateLabel(resolved);
	if (isSalesPipelineFulfillmentCompleted(resolved)) return { tone: "completed", label, completed: true };
	const tone: DispatchCalendarTone = resolved === "conflict" ? "conflict"
		: resolved === "unknown" || resolved === "not_required" ? "unknown"
		: resolved === "backlog" ? "queued"
		: resolved === "packed" ? "ready" : "in_progress";
	return { tone, label, completed: false };
}

export function matchesDispatchCalendarStages(stages: readonly string[], operationalStage: string, state: FulfillmentState) {
	if (!stages.length) return true;
	const stage = operationalStage === "cancelled" ? "cancelled"
		: isSalesPipelineFulfillmentCompleted(state) ? "fulfilled"
		: operationalStage === "fulfilled" ? null : operationalStage;
	return stage !== null && stages.includes(stage);
}
