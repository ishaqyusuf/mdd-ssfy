import type { SalesOrderLifecycleStatus } from "./order-status";

export const BULK_PRODUCTION_COMPLETION_LIMIT = 40;

const PRODUCTION_COMPLETED_STATUSES = new Set<SalesOrderLifecycleStatus>([
	"ready_to_fulfill",
	"fulfillment_queued",
	"packing",
	"packed",
	"in_transit",
	"fulfilled",
]);

export function hasCompletedProductionLifecycle(
	status: SalesOrderLifecycleStatus,
) {
	return PRODUCTION_COMPLETED_STATUSES.has(status);
}

export type BulkProductionCompletionCandidate = {
	salesId: number;
	orderNo: string;
	lifecycleStatus: SalesOrderLifecycleStatus;
};

export type BulkProductionCompletionReadyItem = {
	salesId: number;
	orderNo: string;
};

export type BulkProductionCompletionOutcome = {
	salesId: number;
	orderNo?: string;
	status: "succeeded" | "already_completed" | "awaiting_review" | "failed";
	error?: string;
};

export type BulkProductionCompletionResult = {
	requestId: string;
	total: number;
	succeeded: number;
	alreadyCompleted: number;
	awaitingReview: number;
	failed: number;
	durationMs: number;
	outcomes: BulkProductionCompletionOutcome[];
};

export function normalizeBulkProductionCompletionSalesIds(
	salesIds: readonly number[],
) {
	const normalized = Array.from(
		new Set(
			salesIds.filter(
				(salesId) => Number.isInteger(salesId) && Number(salesId) > 0,
			),
		),
	);
	if (!normalized.length) {
		throw new Error("Select at least one sales order to complete production.");
	}
	if (normalized.length > BULK_PRODUCTION_COMPLETION_LIMIT) {
		throw new Error(
			`Bulk production completion is limited to ${BULK_PRODUCTION_COMPLETION_LIMIT} orders.`,
		);
	}
	return normalized;
}

export function prepareBulkProductionCompletion(input: {
	salesIds: readonly number[];
	candidates: readonly BulkProductionCompletionCandidate[];
}) {
	const candidatesById = new Map(
		input.candidates.map((candidate) => [candidate.salesId, candidate]),
	);
	const ready: BulkProductionCompletionReadyItem[] = [];
	const outcomes: BulkProductionCompletionOutcome[] = [];

	for (const salesId of input.salesIds) {
		const candidate = candidatesById.get(salesId);
		if (!candidate) {
			outcomes.push({
				salesId,
				status: "failed",
				error: "The sales order is no longer available.",
			});
			continue;
		}
		if (hasCompletedProductionLifecycle(candidate.lifecycleStatus)) {
			outcomes.push({
				salesId,
				orderNo: candidate.orderNo,
				status: "already_completed",
			});
			continue;
		}
		if (candidate.lifecycleStatus === "cancelled") {
			outcomes.push({
				salesId,
				orderNo: candidate.orderNo,
				status: "failed",
				error: "Cancelled orders cannot be marked production completed.",
			});
			continue;
		}
		ready.push({ salesId, orderNo: candidate.orderNo });
	}

	return { ready, outcomes };
}

export function summarizeBulkProductionCompletionResult(input: {
	requestId: string;
	total: number;
	startedAt: number;
	outcomes: BulkProductionCompletionOutcome[];
}): BulkProductionCompletionResult {
	return {
		requestId: input.requestId,
		total: input.total,
		succeeded: input.outcomes.filter((item) => item.status === "succeeded")
			.length,
		alreadyCompleted: input.outcomes.filter(
			(item) => item.status === "already_completed",
		).length,
		awaitingReview: input.outcomes.filter(
			(item) => item.status === "awaiting_review",
		).length,
		failed: input.outcomes.filter((item) => item.status === "failed").length,
		durationMs: Math.max(0, Date.now() - input.startedAt),
		outcomes: input.outcomes,
	};
}
