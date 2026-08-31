export type ProductionWorkflowStatusCode =
	| "not_applicable"
	| "not_assigned"
	| "partially_assigned"
	| "assigned"
	| "in_production"
	| "awaiting_review"
	| "production_completed";

type ProductionStat = {
	score?: number | null;
	total?: number | null;
};

export type ProductionWorkflowStatus = {
	code: ProductionWorkflowStatusCode;
	label: string;
	score: number;
	total: number;
	percentage: number;
};

function quantity(value?: number | null) {
	const quantity = Number(value || 0);
	return Number.isFinite(quantity) ? Math.max(quantity, 0) : 0;
}

export function resolveProductionWorkflowStatus({
	assignment,
	production,
	hasPendingReview = false,
	completed = false,
}: {
	assignment?: ProductionStat | null;
	production?: ProductionStat | null;
	hasPendingReview?: boolean;
	completed?: boolean;
}): ProductionWorkflowStatus {
	const assigned = quantity(assignment?.score);
	const produced = quantity(production?.score);
	const total = Math.max(
		quantity(assignment?.total),
		quantity(production?.total),
	);
	const percentage = total > 0 ? Math.min((produced / total) * 100, 100) : 0;
	const result = (code: ProductionWorkflowStatusCode, label: string) => ({
		code,
		label,
		score: produced,
		total,
		percentage,
	});

	if (total <= 0) return result("not_applicable", "No production required");
	if (completed || produced >= total) {
		return {
			...result("production_completed", "Production completed"),
			percentage: 100,
		};
	}
	if (hasPendingReview) return result("awaiting_review", "Awaiting review");
	if (produced > 0) return result("in_production", "In production");
	if (assigned >= total) return result("assigned", "Assigned");
	if (assigned > 0) {
		return result("partially_assigned", "Partially assigned");
	}

	return result("not_assigned", "Not assigned");
}
