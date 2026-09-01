import { userHasPermission } from "@gnd/auth/utils";
import { db } from "@gnd/db";
import {
	type BulkFulfillmentOutcome,
	type FulfillmentDispatchResolution,
	type UpdateSalesControl,
	buildSalesDispatchBacklogWhere,
	ensureSalesOrderFulfillmentDispatch,
	normalizeBulkFulfillmentSalesIds,
	prepareBulkFulfillmentResolution,
	summarizeBulkFulfillmentResult,
} from "@gnd/sales";
import { type TaskName, bulkMarkSalesFulfilledSchema } from "@jobs/schema";
import {
	AbortTaskRunError,
	idempotencyKeys,
	logger,
	metadata,
	schemaTask,
} from "@trigger.dev/sdk";
import { updateSalesControl } from "./update-sales-control";

function safeErrorMessage(error: unknown) {
	if (error instanceof Error && error.message.trim()) return error.message;
	if (error && typeof error === "object") {
		const message = (error as { message?: unknown }).message;
		if (typeof message === "string" && message.trim()) return message;
	}
	return "The fulfillment operation failed.";
}

export const bulkMarkSalesFulfilled = schemaTask({
	id: "bulk-mark-sales-fulfilled" as TaskName,
	schema: bulkMarkSalesFulfilledSchema,
	maxDuration: 900,
	queue: {
		concurrencyLimit: 2,
	},
	run: async (input) => {
		const startedAt = Date.now();
		const salesIds = normalizeBulkFulfillmentSalesIds(input.salesIds);
		const canFulfill = await userHasPermission(
			db,
			input.actor.id,
			"viewMarkSalesOrderFulfilled",
		);
		if (!canFulfill) {
			throw new AbortTaskRunError(
				"You do not have permission to mark sales orders fulfilled.",
			);
		}

		metadata
			.set("status", "resolving_dispatches")
			.set("total", salesIds.length)
			.set("resolved", 0)
			.set("completed", 0);
		const outcomes: BulkFulfillmentOutcome[] = [];
		const resolutions: FulfillmentDispatchResolution[] = [];
		for (const salesId of salesIds) {
			try {
				resolutions.push(
					await ensureSalesOrderFulfillmentDispatch(db, {
						salesId,
						createdById: input.actor.id,
					}),
				);
			} catch (error) {
				const message = safeErrorMessage(error);
				outcomes.push({ salesId, status: "failed", error: message });
				logger.error("Bulk fulfillment dispatch resolution failed.", {
					error: message,
					requestId: input.requestId,
					salesId,
				});
			}
			metadata.increment("resolved", 1);
		}

		const prepared = prepareBulkFulfillmentResolution(resolutions);
		outcomes.push(...prepared.outcomes);
		if (prepared.ready.length) {
			metadata.set("status", "fulfilling").set("queued", prepared.ready.length);
			const batchItems = await Promise.all(
				prepared.ready.map(async (item) => ({
					payload: {
						meta: {
							salesId: item.salesId,
							authorId: input.actor.id,
							authorName: input.actor.name,
						},
						markAsCompleted: {
							dispatchId: item.dispatchId,
							completionRequestId: input.requestId,
							receivedBy: input.actor.name,
							receivedDate: new Date(),
						},
					} as UpdateSalesControl,
					options: {
						idempotencyKey: await idempotencyKeys.create(
							`bulk-mark-sales-fulfilled:${input.requestId}:${item.salesId}`,
							{ scope: "global" },
						),
						idempotencyKeyTTL: "7d" as const,
					},
				})),
			);
			const batch = await updateSalesControl.batchTriggerAndWait(batchItems);
			for (const [index, item] of prepared.ready.entries()) {
				const run = batch.runs[index];
				if (run?.ok) {
					outcomes.push({
						salesId: item.salesId,
						orderNo: item.orderNo,
						dispatchId: item.dispatchId,
						status: "succeeded",
					});
				} else {
					const message = safeErrorMessage(run?.error);
					outcomes.push({
						salesId: item.salesId,
						orderNo: item.orderNo,
						dispatchId: item.dispatchId,
						status: "failed",
						error: message,
					});
					logger.error("One bulk fulfillment child run failed.", {
						dispatchId: item.dispatchId,
						error: message,
						requestId: input.requestId,
						runId: run?.id,
						salesId: item.salesId,
					});
				}
				metadata.increment("completed", 1);
			}
		}

		const backlogCount = await db.salesOrders.count({
			where: buildSalesDispatchBacklogWhere(),
		});
		const result = summarizeBulkFulfillmentResult({
			requestId: input.requestId,
			backlogCount,
			total: salesIds.length,
			startedAt,
			outcomes,
		});
		metadata
			.set("status", result.failed ? "completed_with_errors" : "completed")
			.set("succeeded", result.succeeded)
			.set("alreadyFulfilled", result.alreadyFulfilled)
			.set("failed", result.failed)
			.set("durationMs", result.durationMs);
		metadata.set("backlogCount", result.backlogCount);
		logger.info("Bulk sales fulfillment completed.", {
			alreadyFulfilled: result.alreadyFulfilled,
			durationMs: result.durationMs,
			failed: result.failed,
			requestId: result.requestId,
			succeeded: result.succeeded,
			total: result.total,
		});
		return result;
	},
});
