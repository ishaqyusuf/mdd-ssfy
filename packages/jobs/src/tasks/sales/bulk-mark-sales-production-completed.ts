import { userHasPermission } from "@gnd/auth/utils";
import { db } from "@gnd/db";
import {
	type BulkProductionCompletionOutcome,
	type SalesPipelineSnapshot,
	type UpdateSalesControl,
	evaluateSalesPipelineCommand,
	getSalesOrderLifecycleStatus,
	getSalesPipelineSnapshots,
	hasCompletedProductionLifecycle,
	normalizeBulkProductionCompletionSalesIds,
	shouldEnforceCanonicalSalesPipelineCommands,
	summarizeBulkProductionCompletionResult,
} from "@gnd/sales";
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

function legacyProductionLifecycle(snapshot: SalesPipelineSnapshot) {
	const aggregate = snapshot.evidence.production.aggregate;
	return getSalesOrderLifecycleStatus({
		orderStatus: snapshot.evidence.legacy?.orderStatus,
		legacyProductionStatus: snapshot.evidence.legacy?.productionStatus,
		productionStatus:
			aggregate && Number(aggregate.percentage || 0) >= 100
				? "completed"
				: aggregate && Number(aggregate.score || 0) > 0
					? "in progress"
					: null,
		fulfillmentStatus: snapshot.evidence.legacy?.fulfillmentStatus,
	});
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
		const snapshots = await getSalesPipelineSnapshots(db, salesIds);
		const ready: Array<{
			salesId: number;
			orderNo: string;
			revision?: string;
		}> = [];
		const outcomes: BulkProductionCompletionOutcome[] = [];
		for (const salesId of salesIds) {
			const snapshot = snapshots.get(salesId);
			if (!snapshot) {
				outcomes.push({
					salesId,
					status: "failed",
					error: "The sales order is no longer available.",
				});
				continue;
			}
			if (!shouldEnforceCanonicalSalesPipelineCommands(salesId)) {
				const lifecycle = legacyProductionLifecycle(snapshot);
				if (hasCompletedProductionLifecycle(lifecycle)) {
					outcomes.push({
						salesId,
						orderNo: snapshot.evidence.orderNo,
						status: "already_completed",
					});
				} else if (lifecycle === "cancelled") {
					outcomes.push({
						salesId,
						orderNo: snapshot.evidence.orderNo,
						status: "failed",
						error: "Cancelled orders cannot be marked production completed.",
					});
				} else {
					ready.push({ salesId, orderNo: snapshot.evidence.orderNo });
				}
				continue;
			}
			const decision = evaluateSalesPipelineCommand(snapshot, {
				action: "production.complete",
				authorized: true,
				expectedRevision: snapshot.revision,
			});
			if (decision.status === "ready") {
				ready.push({
					salesId,
					orderNo: snapshot.evidence.orderNo,
					revision: snapshot.revision,
				});
			} else if (decision.status === "replay") {
				outcomes.push({
					salesId,
					orderNo: snapshot.evidence.orderNo,
					status: "already_completed",
				});
			} else if (decision.status === "review_required") {
				outcomes.push({
					salesId,
					orderNo: snapshot.evidence.orderNo,
					status: "awaiting_review",
				});
			} else {
				outcomes.push({
					salesId,
					orderNo: snapshot.evidence.orderNo,
					status: "failed",
					error: decision.reasons.join(", "),
				});
			}
		}

		if (ready.length) {
			metadata
				.set("status", "completing_production")
				.set("queued", ready.length);
			const batchItems = await Promise.all(
				ready.map(async (item) => ({
					payload: {
						meta: {
							salesId: item.salesId,
							authorId: input.actor.id,
							authorName: input.actor.name,
							allowProductionSubmissionForOthers: canEditProduction,
							pipelineRevision: item.revision,
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
			for (const [index, item] of ready.entries()) {
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
