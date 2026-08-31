import { userHasPermission } from "@gnd/auth/utils";
import { db } from "@gnd/db";
import {
	type BulkProductionCompletionOutcome,
	type UpdateSalesControl,
	getSalesOrderLifecycleStatus,
	normalizeBulkProductionCompletionSalesIds,
	prepareBulkProductionCompletion,
	summarizeBulkProductionCompletionResult,
} from "@gnd/sales";
import { resolveSalesInventoryFulfillmentStatus } from "@gnd/sales/sales-inventory-policy";
import { overallStatus } from "@gnd/sales/utils";
import {
	type TaskName,
	bulkMarkSalesProductionCompletedSchema,
} from "@jobs/schema";
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
	return "The production completion operation failed.";
}

export const bulkMarkSalesProductionCompleted = schemaTask({
	id: "bulk-mark-sales-production-completed" as TaskName,
	schema: bulkMarkSalesProductionCompletedSchema,
	maxDuration: 900,
	queue: {
		concurrencyLimit: 2,
	},
	run: async (input) => {
		const startedAt = Date.now();
		const salesIds = normalizeBulkProductionCompletionSalesIds(input.salesIds);
		const [canViewProduction, canEditProduction] = await Promise.all([
			userHasPermission(db, input.actor.id, "viewProduction"),
			userHasPermission(db, input.actor.id, "editProduction"),
		]);
		if (!(canViewProduction || canEditProduction)) {
			throw new AbortTaskRunError(
				"You do not have permission to complete production work.",
			);
		}

		metadata
			.set("status", "resolving_orders")
			.set("total", salesIds.length)
			.set("completed", 0);
		const rows = await db.salesOrders.findMany({
			where: {
				id: { in: salesIds },
				deletedAt: null,
				type: "order",
			},
			select: {
				id: true,
				orderId: true,
				status: true,
				prodStatus: true,
				stat: true,
				deliveries: {
					where: { deletedAt: null },
					select: {
						status: true,
						_count: { select: { items: true } },
					},
				},
			},
		});
		const candidates = rows.map((row) => {
			const status = overallStatus(row.stat);
			return {
				salesId: row.id,
				orderNo: row.orderId || String(row.id),
				lifecycleStatus: getSalesOrderLifecycleStatus({
					orderStatus: row.status,
					legacyProductionStatus: row.prodStatus,
					productionStatus: status.production.status,
					fulfillmentStatus:
						resolveSalesInventoryFulfillmentStatus({
							deliveries: row.deliveries,
							stats: row.stat,
						}) ?? status.delivery.status,
				}),
			};
		});
		const prepared = prepareBulkProductionCompletion({
			salesIds,
			candidates,
		});
		const outcomes: BulkProductionCompletionOutcome[] = [...prepared.outcomes];

		if (prepared.ready.length) {
			metadata
				.set("status", "completing_production")
				.set("queued", prepared.ready.length);
			const batchItems = await Promise.all(
				prepared.ready.map(async (item) => ({
					payload: {
						meta: {
							salesId: item.salesId,
							authorId: input.actor.id,
							authorName: input.actor.name,
							allowProductionSubmissionForOthers: canEditProduction,
						},
						submitAll: {
							submissionSource: "sales_mark_as_completed",
						},
					} as UpdateSalesControl,
					options: {
						idempotencyKey: await idempotencyKeys.create(
							`bulk-mark-sales-production-completed:${input.requestId}:${item.salesId}`,
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
					const output = run.output as { state?: string } | undefined;
					outcomes.push({
						salesId: item.salesId,
						orderNo: item.orderNo,
						status:
							output?.state === "pending_material_review"
								? "awaiting_review"
								: "succeeded",
					});
				} else {
					const message = safeErrorMessage(run?.error);
					outcomes.push({
						salesId: item.salesId,
						orderNo: item.orderNo,
						status: "failed",
						error: message,
					});
					logger.error("One bulk production completion child run failed.", {
						error: message,
						requestId: input.requestId,
						runId: run?.id,
						salesId: item.salesId,
					});
				}
				metadata.increment("completed", 1);
			}
		}

		const result = summarizeBulkProductionCompletionResult({
			requestId: input.requestId,
			total: salesIds.length,
			startedAt,
			outcomes,
		});
		metadata
			.set("status", result.failed ? "completed_with_errors" : "completed")
			.set("succeeded", result.succeeded)
			.set("alreadyCompleted", result.alreadyCompleted)
			.set("awaitingReview", result.awaitingReview)
			.set("failed", result.failed)
			.set("durationMs", result.durationMs);
		logger.info("Bulk sales production completion finished.", {
			alreadyCompleted: result.alreadyCompleted,
			awaitingReview: result.awaitingReview,
			durationMs: result.durationMs,
			failed: result.failed,
			requestId: result.requestId,
			succeeded: result.succeeded,
			total: result.total,
		});
		return result;
	},
});
