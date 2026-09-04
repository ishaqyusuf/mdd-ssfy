export type ProductionBulkAction =
	| "assign"
	| "submit"
	| "delete.submit"
	| "delete.assign";

const actionFeedback: Record<
	ProductionBulkAction,
	{
		label: string;
		pending: string;
		progress: string;
		success: string;
		failure: string;
	}
> = {
	assign: {
		label: "Assign All",
		pending: "Assigning production…",
		progress: "Assigning…",
		success: "Production assignments created",
		failure: "Could not create production assignments",
	},
	submit: {
		label: "Submit All",
		pending: "Submitting production…",
		progress: "Submitting…",
		success: "Production submitted",
		failure: "Could not submit production",
	},
	"delete.submit": {
		label: "Delete Submissions",
		pending: "Deleting production submissions…",
		progress: "Deleting…",
		success: "Production submissions deleted",
		failure: "Could not delete production submissions",
	},
	"delete.assign": {
		label: "Delete Assignments",
		pending: "Deleting production assignments…",
		progress: "Deleting…",
		success: "Production assignments deleted",
		failure: "Could not delete production assignments",
	},
};

export function getProductionActionFeedback(action: ProductionBulkAction) {
	return actionFeedback[action];
}

export function getProductionDeleteConfirmation(
	action: ProductionBulkAction,
	quantity: number,
) {
	if (action === "delete.assign") {
		return {
			title: "Delete assignments?",
			description: `This will delete assignments for quantity ${quantity}.`,
			confirmLabel: "Delete Assignments",
		};
	}
	if (action === "delete.submit") {
		return {
			title: "Delete submissions?",
			description: `This will delete submissions for quantity ${quantity}.`,
			confirmLabel: "Delete Submissions",
		};
	}
	return null;
}

export function getProductionOrderDueDate(
	value: Date | string | null | undefined,
) {
	if (!value) return null;
	const parsed = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return new Date(
		parsed.getUTCFullYear(),
		parsed.getUTCMonth(),
		parsed.getUTCDate(),
		12,
	);
}

function containsRefreshFailure(value: unknown): boolean {
	if (Array.isArray(value)) return value.some(containsRefreshFailure);
	if (!value || typeof value !== "object") return false;
	const result = value as { isError?: unknown; status?: unknown };
	return result.status === "rejected" || result.isError === true;
}

export function hasProductionRefreshFailure(
	results: readonly PromiseSettledResult<unknown>[],
) {
	return results.some(
		(result) =>
			result.status === "rejected" || containsRefreshFailure(result.value),
	);
}
