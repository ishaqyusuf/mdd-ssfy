import type { FulfillmentDispatchResolution } from "./sales-control/ensure-fulfillment-dispatch";

export const BULK_FULFILLMENT_LIMIT = 40;

export type BulkFulfillmentOutcome = {
	salesId: number;
	orderNo?: string;
	dispatchId?: number | null;
	status: "succeeded" | "already_fulfilled" | "failed";
	error?: string;
};

export type BulkFulfillmentResult = {
	requestId: string;
	backlogCount: number;
	total: number;
	succeeded: number;
	alreadyFulfilled: number;
	failed: number;
	durationMs: number;
	outcomes: BulkFulfillmentOutcome[];
};

export function normalizeBulkFulfillmentSalesIds(salesIds: readonly number[]) {
	const normalized = Array.from(
		new Set(
			salesIds.filter(
				(salesId) => Number.isInteger(salesId) && Number(salesId) > 0,
			),
		),
	);
	if (!normalized.length) {
		throw new Error("Select at least one sales order to fulfill.");
	}
	if (normalized.length > BULK_FULFILLMENT_LIMIT) {
		throw new Error(
			`Bulk fulfillment is limited to ${BULK_FULFILLMENT_LIMIT} orders.`,
		);
	}
	return normalized;
}

export function prepareBulkFulfillmentResolution(
	resolutions: readonly FulfillmentDispatchResolution[],
) {
	const ready: Array<{ salesId: number; orderNo: string; dispatchId: number }> =
		[];
	const outcomes: BulkFulfillmentOutcome[] = [];
	for (const resolution of resolutions) {
		if (resolution.state === "already_fulfilled") {
			outcomes.push({
				salesId: resolution.salesId,
				orderNo: resolution.orderNo,
				dispatchId: resolution.dispatchId,
				status: "already_fulfilled",
			});
			continue;
		}
		if (!resolution.dispatchId) {
			outcomes.push({
				salesId: resolution.salesId,
				orderNo: resolution.orderNo,
				dispatchId: null,
				status: "failed",
				error: "Fulfillment dispatch was not resolved.",
			});
			continue;
		}
		ready.push({
			salesId: resolution.salesId,
			orderNo: resolution.orderNo,
			dispatchId: resolution.dispatchId,
		});
	}
	return { ready, outcomes };
}

export function summarizeBulkFulfillmentResult(input: {
	requestId: string;
	backlogCount: number;
	total: number;
	startedAt: number;
	outcomes: BulkFulfillmentOutcome[];
}): BulkFulfillmentResult {
	return {
		requestId: input.requestId,
		backlogCount: input.backlogCount,
		total: input.total,
		succeeded: input.outcomes.filter((item) => item.status === "succeeded")
			.length,
		alreadyFulfilled: input.outcomes.filter(
			(item) => item.status === "already_fulfilled",
		).length,
		failed: input.outcomes.filter((item) => item.status === "failed").length,
		durationMs: Math.max(0, Date.now() - input.startedAt),
		outcomes: input.outcomes,
	};
}
