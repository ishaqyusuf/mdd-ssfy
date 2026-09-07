import type { SalesPipelineSnapshot } from "./sales-pipeline";

export function getProductionCalendarPresentation(
	snapshot: SalesPipelineSnapshot | null | undefined,
	planningGap = false,
) {
	const state = snapshot?.production.state;
	const statusOnly =
		snapshot?.evidence.production.administrativeCompletion?.method ===
		"STATUS_ONLY";
	if (state === "completed" || state === "administratively_completed") {
		return {
			tone: "completed" as const,
			label: "Production completed",
			statusOnly,
		};
	}
	if (
		state === "conflict" ||
		snapshot?.conflicts.some((conflict) => conflict.severity === "blocking")
	) {
		return {
			tone: "conflict" as const,
			label: "Needs review",
			statusOnly: false,
		};
	}
	if (
		!snapshot ||
		snapshot.freshness.state !== "current" ||
		snapshot.commercial.state === "unknown" ||
		(planningGap && snapshot.production.requiredQty <= 0) ||
		state === "unknown"
	) {
		return {
			tone: "unknown" as const,
			label: "Status unavailable",
			statusOnly: false,
		};
	}
	if (state === "in_production" || state === "awaiting_review") {
		return {
			tone: "in progress" as const,
			label: state === "awaiting_review" ? "Awaiting review" : "In production",
			statusOnly: false,
		};
	}
	if (
		planningGap ||
		state === "not_assigned" ||
		state === "partially_assigned"
	) {
		return {
			tone: "unassigned" as const,
			label:
				state === "partially_assigned" ? "Partially assigned" : "Not assigned",
			statusOnly: false,
		};
	}
	return {
		tone: state === "assigned" ? ("assigned" as const) : ("unknown" as const),
		label: state === "assigned" ? "Assigned" : "No production required",
		statusOnly: false,
	};
}
