import type { FulfillmentDispatchResolution } from "./sales-control/ensure-fulfillment-dispatch";
import type { SalesPipelineSnapshot } from "./sales-pipeline";

export const BULK_FULFILLMENT_LIMIT = 40;

export type BulkFulfillmentOutcome = {
	salesId: number;
	orderNo?: string;
	dispatchId?: number | null;
	status: "succeeded" | "already_fulfilled" | "review_required" | "failed";
	error?: string;
};

export type BulkFulfillmentResult = {
	requestId: string;
	backlogCount: number;
	total: number;
	succeeded: number;
	alreadyFulfilled: number;
	reviewRequired: number;
	failed: number;
	durationMs: number;
	outcomes: BulkFulfillmentOutcome[];
};

export function resolveBulkFulfillmentCompletionOutcome(
	item: { salesId: number; orderNo: string; dispatchId: number },
	state: SalesPipelineSnapshot["fulfillment"]["state"] | undefined,
): BulkFulfillmentOutcome {
	if (state === "fulfilled") return { ...item, status: "succeeded" };
	if (state === "administratively_completed") {
		return { ...item, status: "already_fulfilled" };
	}
	return {
		...item,
		status: "review_required",
		error:
			state === undefined
				? "Unable to verify the order after fulfillment. Refresh and review its fulfillments."
				: "The fulfillment completed, but the order still has outstanding quantities or completion checks. Review its remaining fulfillments.",
	};
}

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
	const ready: Array<{
		salesId: number;
		orderNo: string;
		dispatchId: number;
		dispatchIds?: number[];
	}> = [];
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
			...(resolution.dispatchIds
				? { dispatchIds: resolution.dispatchIds }
				: {}),
		});
	}
	return { ready, outcomes };
}

export function buildBulkFulfillmentRounds(
	items: ReturnType<typeof prepareBulkFulfillmentResolution>["ready"],
) {
	const rounds: Array<
		Array<{
			salesId: number;
			orderNo: string;
			dispatchId: number;
			final: boolean;
		}>
	> = [];
	for (const item of items) {
		const dispatchIds = [
			...new Set(
				item.dispatchIds?.length ? item.dispatchIds : [item.dispatchId],
			),
		];
		for (const [index, dispatchId] of dispatchIds.entries()) {
			(rounds[index] ??= []).push({
				salesId: item.salesId,
				orderNo: item.orderNo,
				dispatchId,
				final: index === dispatchIds.length - 1,
			});
		}
	}
	return rounds;
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
		reviewRequired: input.outcomes.filter(
			(item) => item.status === "review_required",
		).length,
		failed: input.outcomes.filter((item) => item.status === "failed").length,
		durationMs: Math.max(0, Date.now() - input.startedAt),
		outcomes: input.outcomes,
	};
}
