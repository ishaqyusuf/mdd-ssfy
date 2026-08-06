import { createHash } from "node:crypto";

import type { Prisma, TransactionClient } from "@gnd/db";
import { runDbTransaction } from "@gnd/db/transactions";
import type { RenturnTypeAsync } from "@gnd/utils";
import type { NoteTagTypes } from "@gnd/utils/constants";
import { type SaveNoteSchema, noteTag, saveNote } from "@gnd/utils/note";
import { hasQty } from "@gnd/utils/sales";
import { updateSalesItemControlAction, updateSalesStatControlAction } from ".";
import { autoReviewSalesPaymentsForOrderAction } from "../payment-system/application/payment-review";
import type { DeletePackingSchema, UpdateSalesControl } from "../schema";
import type {
	Db,
	DispatchItemPackingStatus,
	SalesDispatchStatus,
} from "../types";
import { pickQtyFrom, recomposeQty } from "../utils/sales-control";
import {
	buildProductionSubmissionPlan,
	type CreateSalesAssignmentProps,
	createSalesAssignmentAction,
	packDispatchItemsAction,
	resetSalesAction,
	submitAssignmentsAction,
	submitNonProductionsAction,
} from "./actions";
import { prepareProductionSubmissionMaterialReview } from "../production-submission-review/service";
import { createProductionPayrollForSubmissions } from "../production-submission-review/decision";
import { resolveDispatchCompletionAttempt } from "./dispatch-completion";
import { getSaleInformation } from "./get-sale-information";
import { getSalesSetting } from "./settings";

async function getPaymentReviewSettings(db: Db) {
	const setting = await getSalesSetting(db);
	return setting.data?.paymentReview ?? null;
}

type SubmitAllTaskDependencies = {
	prepareMaterialReview?: typeof prepareProductionSubmissionMaterialReview;
};

type SubmitAllTaskOptions = {
	emptySubmissionBehavior?: "error" | "skip";
};

export async function submitAllTask(
	db: Db,
	data: UpdateSalesControl,
	dependencies: SubmitAllTaskDependencies = {},
	options: SubmitAllTaskOptions = {},
) {
	const submitArgs = data.submitAll;
	if (!submitArgs)
		throw new Error("Production submission details are required.");
	const effectiveSubmitArgs = {
		...submitArgs,
		assignedToId: data.meta.allowProductionSubmissionForOthers
			? submitArgs.assignedToId
			: data.meta.authorId,
	};
	const paymentReviewSettings = await getPaymentReviewSettings(db);
	const info = await getSaleInformation(
		db,
		{
			salesId: data.meta.salesId,
			assignedToId: effectiveSubmitArgs.assignedToId ?? undefined,
		},
		{ persistDerivedState: true },
	);
	const submissionPlan = buildProductionSubmissionPlan({
		authorId: data.meta.authorId,
		data: info,
		...effectiveSubmitArgs,
	});
	if (!submissionPlan.itemScope.length) {
		if (options.emptySubmissionBehavior === "skip") return null;
		throw new Error("Unable to complete, nothing to submit!");
	}
	const idempotencyKey =
		submitArgs.idempotencyKey ||
		`production:${createHash("sha256")
			.update(
				JSON.stringify({
					salesOrderId: data.meta.salesId,
					submittedById: data.meta.authorId,
					itemScope: submissionPlan.itemScope,
				}),
			)
			.digest("hex")}`;
	const resp = await runDbTransaction(
		{
			client: db,
			operation: "sales-control.submit-all",
			profile: "workflow",
		},
		async (tx) => {
			const review = await (
				dependencies.prepareMaterialReview ??
				prepareProductionSubmissionMaterialReview
			)(tx as any, {
				salesOrderId: data.meta.salesId,
				submittedById: data.meta.authorId,
				idempotencyKey,
				itemScope: submissionPlan.itemScope,
			});
			if (review.reviewId) {
				const submittedCount = await tx.orderProductionSubmissions.count({
					where: {
						materialReviewId: review.reviewId,
						deletedAt: null,
					},
				});
				if (submittedCount > 0) {
					return {
						state: review.state,
						reason: review.reason,
						reviewId: review.reviewId,
						materialRevision: review.materialRevision,
						submittedCount,
						idempotentReplay: true,
					};
				}
			}
			const submittedCount = await submitAssignmentsAction(tx as any, {
				authorId: data.meta.authorId,
				data: info,
				materialReviewId: review.reviewId,
				...effectiveSubmitArgs,
			});
			if (!submittedCount) {
				throw new Error("Unable to complete, nothing to submit!");
			}
			await resetSalesAction(tx as any, data.meta.salesId!);
			if (review.state === "finalized") {
				const submissions = review.reviewId
					? await tx.orderProductionSubmissions.findMany({
							where: {
								materialReviewId: review.reviewId,
								deletedAt: null,
							},
							select: {
								id: true,
								qty: true,
								assignment: {
									select: {
										assignedToId: true,
										laborCost: true,
										salesItemControlUid: true,
									},
								},
							},
						})
					: [];
				await createProductionPayrollForSubmissions(tx as any, {
					salesOrderId: data.meta.salesId,
					submissions,
				});
				await autoReviewSalesPaymentsForOrderAction(tx as any, {
					salesId: data.meta.salesId!,
					action: "production",
					settings: paymentReviewSettings,
					reviewedById: data.meta.authorId,
					reviewNote: "Auto-reviewed after production completion.",
				});
			}
			return {
				state: review.state,
				reason: review.reason,
				reviewId: review.reviewId,
				materialRevision: review.materialRevision,
				submittedCount,
				idempotentReplay: false,
			};
		},
	);
	return resp;
}
export async function createAssignmentsTask(
	db: Db,
	data: UpdateSalesControl,
	options?: {
		productionReadinessOverride?: {
			revision: string;
			lineItemUids: string[] | null;
		};
	},
) {
	const payload = data.createAssignments;
	const paymentReviewSettings = await getPaymentReviewSettings(db);
	const info = await getSaleInformation(
		db,
		{
			salesId: data.meta.salesId,
		},
		{ persistDerivedState: true },
	);

	const createAssignments: CreateSalesAssignmentProps["items"] = [];
	for (const item of info.items) {
		const s = payload?.selections?.find((s) => s.uid === item.controlUid);
		if (s) {
			const { pendingPick, picked, remainder } = pickQtyFrom(
				recomposeQty(s.qty as any),
				recomposeQty(item.analytics.assignment.pending),
			);

			if (picked) {
				// picked.lh
				createAssignments.push({
					itemInfo: item,
					qty: picked,
				});
			}
		}
	}
	if (createAssignments.length != payload?.selections?.length) {
		if (!payload?.retries) {
			await resetSalesAction(db, data.meta.salesId);
			return createAssignmentsTask(
				db,
				{
					...data,
					createAssignments: {
						...payload,
						retries: 1,
					},
				},
				options,
			);
		}
	}
	if (!createAssignments.length) {
		throw new Error("Unable to complete, nothing to submit!");
	}
	await runDbTransaction(
		{
			client: db,
			operation: "sales-control.create-assignments",
			profile: "workflow",
		},
		async (tx) => {
			await createSalesAssignmentAction(tx as any, {
				items: createAssignments,
				salesId: data.meta.salesId,
				assignedToId: payload?.assignedToId!,
				authorId: data.meta.authorId,
				dueDate: payload?.dueDate,
				updateStats: false,
			});
			await resetSalesAction(tx as any, data.meta.salesId);
			await autoReviewSalesPaymentsForOrderAction(tx as any, {
				salesId: data.meta.salesId,
				action: "production",
				settings: paymentReviewSettings,
				reviewedById: data.meta.authorId,
				reviewNote: "Auto-reviewed after production assignment.",
			});
			if (options?.productionReadinessOverride) {
				await tx.salesHistory.create({
					data: {
						salesId: data.meta.salesId,
						name: "Production inventory readiness override used",
						authorName: data.meta.authorName,
						data: {
							event: "production_readiness_override_used",
							revision: options.productionReadinessOverride.revision,
							triggeredByUserId: data.meta.authorId,
							lineItemUids: options.productionReadinessOverride.lineItemUids,
						},
					},
				});
			}
		},
	);
}
export async function submitNonProductionsTask(
	db: Db,
	data: UpdateSalesControl,
) {
	const info = await getSaleInformation(
		db,
		{
			salesId: data.meta.salesId,
		},
		{ persistDerivedState: true },
	);
	const response = await runDbTransaction(
		{
			client: db,
			operation: "sales-control.submit-non-production",
			profile: "workflow",
		},
		async (tx) => {
			const resp = await submitNonProductionsAction(tx as any, {
				data: info,
				authorId: data.meta.authorId,
			});
			await resetSalesAction(tx as any, data.meta.salesId);
			return resp;
		},
	);
	return {
		info,
		response,
	};
}
export async function clearPackingTask(db: Db, data: UpdateSalesControl) {
	const clearData = data.clearPackings;
	await db.$transaction(async (tx) => {
		await tx.orderItemDelivery.updateMany({
			where: {
				orderId: !clearData?.dispatchId ? data.meta.salesId : undefined,
				orderDeliveryId: !clearData?.dispatchId
					? undefined
					: clearData?.dispatchId,
				packingStatus: {
					not: "unpacked",
				},
			},
			data: {
				packingStatus: "unpacked" as DispatchItemPackingStatus,
				unpackedBy: data.meta.authorName,
			},
		});
		await resetSalesAction(tx as any, data.meta.salesId);
	});
}
export async function deletePackingItem(db: Db, data: DeletePackingSchema) {
	await db.$transaction(async (tx) => {
		await tx.orderItemDelivery.updateMany({
			where: {
				id: !data.packingUid ? data.packingId! : undefined,
				packingUid: data.packingUid ? data.packingUid : undefined,
			},
			data: {
				packingStatus: "unpacked" as DispatchItemPackingStatus,
				packedBy: data.deleteBy,
			},
		});
		await resetSalesAction(tx as any, data.salesId);
	});
}
export async function cancelDispatchTask(
	db: Db,
	data: UpdateSalesControl,
	internal?: {
		releaseDispatchInventory?: (
			tx: TransactionClient,
			input: { orderDeliveryId: number; note?: string | null },
		) => Promise<unknown>;
	},
) {
	await db.$transaction(async (tx) => {
		const dispatchIds = data.cancelDispatch?.dispatchIds?.length
			? data.cancelDispatch.dispatchIds
			: data.cancelDispatch?.dispatchId
				? [data.cancelDispatch.dispatchId]
				: [];
		if (!dispatchIds.length) {
			throw new Error("Unable to cancel fulfillment without a dispatch.");
		}
		const uniqueDispatchIds = [...new Set(dispatchIds)];
		if (internal?.releaseDispatchInventory) {
			for (const orderDeliveryId of uniqueDispatchIds) {
				await internal.releaseDispatchInventory(tx as TransactionClient, {
					orderDeliveryId,
					note: "Released because the dispatch was cancelled.",
				});
			}
		}
		const result = await tx.orderDelivery.updateMany({
			where: {
				id: {
					in: uniqueDispatchIds,
				},
				salesOrderId: data.meta.salesId,
				deletedAt: null,
			},
			data: {
				status: "cancelled" as SalesDispatchStatus,
				deliveredAt: null,
			},
		});
		if (result.count !== uniqueDispatchIds.length) {
			throw new Error(
				"One or more fulfillment dispatches do not belong to this sales order.",
			);
		}
		await resetSalesAction(tx as any, data.meta.salesId);
	});
}
export async function startDispatchTask(
	db: Db,
	data: UpdateSalesControl,
	internal?: {
		assertInventoryReady?: (
			tx: TransactionClient,
			input: { orderDeliveryId: number; salesOrderId: number },
		) => Promise<unknown>;
	},
) {
	await db.$transaction(async (tx) => {
		const orderDeliveryId = data.startDispatch?.dispatchId;
		if (!orderDeliveryId) {
			throw new Error("Unable to start fulfillment without a dispatch.");
		}
		await internal?.assertInventoryReady?.(tx as TransactionClient, {
			orderDeliveryId,
			salesOrderId: data.meta.salesId,
		});
		const started = await tx.orderDelivery.updateMany({
			where: {
				id: orderDeliveryId,
				salesOrderId: data.meta.salesId,
				deletedAt: null,
				status: { in: ["queue", "packed", "cancelled"] },
			},
			data: {
				status: "in progress" as SalesDispatchStatus,
				deliveredAt: null,
			},
		});
		if (started.count !== 1) {
			throw new Error("Dispatch is not available to start.");
		}
		await resetSalesAction(tx as any, data.meta.salesId);
	});
}
export async function submitDispatchTask(
	db: Db,
	data: UpdateSalesControl,
	internal?: {
		allowCompletedResign?: boolean;
		saveNoteAction?: typeof saveNote;
		packingSignoff?: {
			requestId: string;
			documentId: string;
		};
		completeInventoryDispatch?: (
			tx: TransactionClient,
			input: { orderDeliveryId: number; salesOrderId: number; note?: string | null },
		) => Promise<{
			executionMode: "inventory" | "legacy";
			allocationIds: number[];
			consumedQty: number;
		}>;
	},
) {
	const task = data.submitDispatch!;
	const paymentReviewSettings = await getPaymentReviewSettings(db);
	const attachmentTags = (task?.attachments ?? [])
		.filter((a) => a.pathname)
		.map((a) => noteTag("attachment", a.pathname));
	const response = await runDbTransaction(
		{
			client: db,
			operation: "sales-control.submit-dispatch",
			profile: "workflow",
		},
		async (tx) => {
			const currentDispatch = await tx.orderDelivery.findFirst({
				where: {
					id: task.dispatchId!,
					deletedAt: null,
				},
				select: {
					status: true,
					deliveredAt: true,
					salesOrderId: true,
					meta: true,
				},
			});
			if (!currentDispatch) {
				throw new Error("Dispatch not found.");
			}
			if (currentDispatch.salesOrderId !== data.meta.salesId) {
				throw new Error("Dispatch does not belong to this sales order.");
			}

			const completionRequestId = task.completionRequestId?.trim();
			const currentMeta = asJsonRecord(currentDispatch.meta);
			const currentCompletion = asJsonRecord(currentMeta.dispatchCompletion);
			const completionAttempt = internal?.allowCompletedResign
				? "new"
				: resolveDispatchCompletionAttempt({
						status: currentDispatch.status,
						meta: currentDispatch.meta,
						requestId: completionRequestId,
					});
			if (completionAttempt === "replay") {
				return {
					status: "completed" as const,
					idempotent: true,
				};
			}
			if (completionAttempt === "conflict") {
				throw new Error("Dispatch was already completed by another request.");
			}

			const completionMeta = completionRequestId
				? ({
						...currentCompletion,
						requestId: completionRequestId,
						status: "completed",
						signaturePathname: task.signature || undefined,
						attachments: Array.isArray(currentCompletion.attachments)
							? currentCompletion.attachments
							: (task.attachments || []).map((attachment) => ({
									pathname: attachment.pathname,
								})),
						completedAt: new Date().toISOString(),
					} as Record<string, unknown>)
				: null;
			if (internal?.packingSignoff) {
				const currentPackingSignoff = asJsonRecord(currentMeta.packingSignoff);
				if (
					currentPackingSignoff.requestId !==
						internal.packingSignoff.requestId ||
					currentPackingSignoff.status !== "uploaded" ||
					currentPackingSignoff.documentId !==
						internal.packingSignoff.documentId
				) {
					throw new Error("Packing sign-off lease ownership changed.");
				}
			}
			const packingSignoff =
				internal?.packingSignoff?.requestId &&
				internal.packingSignoff.documentId
					? {
							...asJsonRecord(currentMeta.packingSignoff),
							requestId: internal.packingSignoff.requestId,
							status: "domain_completed",
							documentId: internal.packingSignoff.documentId,
							domainCompletedAt: new Date().toISOString(),
						}
					: null;
			const inventoryCompletion = internal?.completeInventoryDispatch
				? await internal.completeInventoryDispatch(tx as TransactionClient, {
						orderDeliveryId: task.dispatchId!,
						salesOrderId: currentDispatch.salesOrderId,
						note: task.note,
					})
				: null;
			const inventoryDispatch =
				inventoryCompletion?.executionMode === "inventory"
					? {
							...asJsonRecord(currentMeta.inventoryDispatch),
							status: "consumed",
							allocationIds: inventoryCompletion.allocationIds,
							consumedQty: inventoryCompletion.consumedQty,
							completionRequestId: completionRequestId || null,
							completedAt: new Date().toISOString(),
						}
					: null;
			await tx.orderDelivery.update({
				where: {
					id: task?.dispatchId!,
				},
				data: {
					status: "completed" as SalesDispatchStatus,
					deliveredAt:
						internal?.allowCompletedResign &&
						currentDispatch.status === "completed"
							? (currentDispatch.deliveredAt ??
								task?.receivedDate ??
								new Date())
							: (task?.receivedDate ?? new Date()),
					...(completionMeta || packingSignoff || inventoryDispatch
						? {
								meta: toInputJson({
									...currentMeta,
									...(completionMeta
										? { dispatchCompletion: completionMeta }
										: {}),
									...(packingSignoff ? { packingSignoff } : {}),
									...(inventoryDispatch ? { inventoryDispatch } : {}),
								}),
							}
						: {}),
				},
			});
			// await resetSalesTask(tx as any, data.meta.salesId);
			const salesId = data.meta.salesId;
			await resetSalesAction(tx as any, salesId);
			await autoReviewSalesPaymentsForOrderAction(tx as any, {
				salesId,
				action: "fulfillment",
				settings: paymentReviewSettings,
				reviewedById: data.meta.authorId,
				reviewNote: "Auto-reviewed after fulfillment completion.",
			});
			const note: SaveNoteSchema = {
				headline: data.meta.authorName,
				subject: `Sales Dispatch Completed`,
				note: task?.note!,
				tags: [
					noteTag("packedBy", data.meta.authorName),
					noteTag("signature", task.signature),
					noteTag("dispatchRecipient", task.receivedBy),
					noteTag("salesId", data.meta.salesId),
					noteTag("deliveryId", task.dispatchId),
					noteTag("type", (task.noteType || "dispatch") as NoteTagTypes),
					...attachmentTags,
				],
			};
			await (internal?.saveNoteAction ?? saveNote)(
				tx,
				note,
				data.meta.authorId,
			);
			return {
				status: "completed" as const,
				idempotent: false,
			};
		},
	);
	return response;
}

function asJsonRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
	return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function buildAutoPackingLines(
	info: RenturnTypeAsync<typeof getSaleInformation>,
): NonNullable<NonNullable<UpdateSalesControl["packItems"]>["packingLines"]> {
	const packingLines: NonNullable<
		NonNullable<UpdateSalesControl["packItems"]>["packingLines"]
	> = [];

	for (const item of info.items) {
		if (!item.itemId) continue;

		const deliverables = (item.deliverables ?? []).filter((d) => hasQty(d.qty));

		if (!deliverables.length) continue;
		for (const deliverable of deliverables) {
			packingLines.push({
				salesItemId: item.itemId,
				submissionId: deliverable.submissionId,
				qty: deliverable.qty,
			});
		}
	}

	return packingLines;
}

async function releaseAutomaticNonProductionMaterialReviews(
	db: Db,
	data: UpdateSalesControl,
	info: RenturnTypeAsync<typeof getSaleInformation>,
) {
	const nonProductionControlUids = info.items
		.filter((item) => item.itemConfig && !item.itemConfig.production)
		.map((item) => item.controlUid)
		.filter((uid): uid is string => Boolean(uid));
	if (!nonProductionControlUids.length) return 0;

	const candidates = await db.orderProductionSubmissions.findMany({
		where: {
			salesOrderId: data.meta.salesId,
			deletedAt: null,
			assignment: {
				salesItemControlUid: { in: nonProductionControlUids },
			},
			materialReview: {
				status: "PENDING",
				classificationReason: "NOT_CONFIGURED",
			},
		},
		select: {
			id: true,
			meta: true,
		},
	});
	const submissionIds = candidates
		.filter(
			(submission) =>
				asJsonRecord(submission.meta).source === "sales_mark_as_completed",
		)
		.map((submission) => submission.id);
	if (!submissionIds.length) return 0;

	return runDbTransaction(
		{
			client: db,
			operation: "sales-control.release-non-production-material-review",
			profile: "workflow",
		},
		async (tx) => {
			const released = await tx.orderProductionSubmissions.updateMany({
				where: {
					id: { in: submissionIds },
					deletedAt: null,
					materialReview: {
						status: "PENDING",
						classificationReason: "NOT_CONFIGURED",
					},
				},
				data: { materialReviewId: null },
			});
			if (!released.count) return 0;

			await tx.salesHistory.create({
				data: {
					salesId: data.meta.salesId,
					name: "Non-production material review released for fulfillment",
					authorName: data.meta.authorName,
					data: {
						type: "non_production_material_review_released",
						submissionIds,
						triggeredByUserId: data.meta.authorId,
					},
				},
			});
			await resetSalesAction(tx as any, data.meta.salesId);
			return released.count;
		},
	);
}

function buildSelectionPackingLinesFromRequestedItems(
	info: RenturnTypeAsync<typeof getSaleInformation>,
	requestedItems: NonNullable<
		NonNullable<UpdateSalesControl["packItems"]>["requestedItems"]
	>,
) {
	const packingLines: NonNullable<
		NonNullable<UpdateSalesControl["packItems"]>["packingLines"]
	> = [];
	const insufficient: string[] = [];

	for (const request of requestedItems) {
		const enteredQty = recomposeQty(request.qty as any);
		if (!hasQty(enteredQty)) continue;

		const matchedItem =
			(request.itemUid
				? info.items.find((item) => item.controlUid === request.itemUid)
				: null) ||
			info.items.find((item) => item.itemId === request.salesItemId);

		if (!matchedItem) {
			insufficient.push(request.title || `Item #${request.salesItemId}`);
			continue;
		}

		let pending = recomposeQty(enteredQty as any);
		const deliverables = (matchedItem.deliverables || []).filter(
			(deliverable) => hasQty(deliverable.qty as any),
		);

		for (const deliverable of deliverables) {
			if (!hasQty(pending)) break;
			const picked = pickQtyFrom(
				recomposeQty(pending as any),
				recomposeQty(deliverable.qty as any),
			);
			if (!hasQty(picked?.picked)) continue;
			packingLines.push({
				salesItemId: Number(request.salesItemId),
				submissionId: Number(deliverable.submissionId),
				qty: recomposeQty(picked.picked as any),
				note: request.note,
			});
			pending = recomposeQty(picked.pendingPick as any);
		}

		if (hasQty(pending)) {
			insufficient.push(request.title || matchedItem.title || "Item");
		}
	}

	return {
		packingLines,
		insufficient,
	};
}

export async function packDispatchItemTask(
	db: Db,
	data: UpdateSalesControl,
	dependencies: SubmitAllTaskDependencies = {},
) {
	const packMode = data.packItems?.packMode!;
	const requestedDispatchStatus = data.packItems?.dispatchStatus;
	let assignmentInfo: RenturnTypeAsync<typeof getSaleInformation> | null = null;
	if (packMode == "all") {
		assignmentInfo = await getSaleInformation(
			db,
			{
				salesId: data.meta.salesId,
			},
			{ persistDerivedState: true },
		);
		const createAssignments: CreateSalesAssignmentProps["items"] =
			assignmentInfo.items
				.filter(
					(item) =>
						!!item.itemId && hasQty(item.analytics?.assignment?.pending),
				)
				.map((item) => ({
					itemInfo: item,
					qty: item.analytics!.assignment.pending,
				}));

		if (createAssignments.length) {
			await runDbTransaction(
				{
					client: db,
					operation: "sales-control.pack-auto-assign",
					profile: "workflow",
				},
				async (tx) => {
					await createSalesAssignmentAction(tx as any, {
						items: createAssignments,
						salesId: data.meta.salesId,
						authorId: data.meta.authorId,
						updateStats: true,
					});
				},
			);
		}
	}
	if (packMode == "all" || packMode == "available")
		await submitAllTask(
			db,
			{
				meta: data.meta,
				submitAll: {},
			},
			dependencies,
			{ emptySubmissionBehavior: "skip" },
		);
	if (packMode == "all" && assignmentInfo)
		await releaseAutomaticNonProductionMaterialReviews(
			db,
			data,
			assignmentInfo,
		);
	const info = await getSaleInformation(
		db,
		{
			salesId: data.meta.salesId,
		},
		{ persistDerivedState: true },
	);
	if (
		data.packItems?.packMode === "selection" &&
		(data.packItems?.requestedItems?.length || 0) > 0
	) {
		let built = buildSelectionPackingLinesFromRequestedItems(
			info,
			data.packItems!.requestedItems!,
		);

		if (built.insufficient.length) {
			await submitNonProductionsTask(db, {
				meta: data.meta,
			} as UpdateSalesControl);
			const refreshed = await getSaleInformation(
				db,
				{
					salesId: data.meta.salesId,
				},
				{ persistDerivedState: true },
			);
			built = buildSelectionPackingLinesFromRequestedItems(
				refreshed,
				data.packItems!.requestedItems!,
			);
			if (built.insufficient.length) {
				throw new Error(
					`Insufficient deliverables for: ${built.insufficient
						.slice(0, 3)
						.join(", ")}${built.insufficient.length > 3 ? "..." : ""}`,
				);
			}
		}
		data.packItems!.packingLines = built.packingLines;
	}
	if (data.packItems?.packMode !== "selection") {
		data.packItems!.packingLines = buildAutoPackingLines(info);
	}
	const response = await runDbTransaction(
		{
			client: db,
			operation: "sales-control.pack-dispatch",
			profile: "workflow",
		},
		async (tx) => {
			if (data.packItems?.replaceExisting) {
				await tx.orderItemDelivery.updateMany({
					where: {
						orderDeliveryId: data.packItems.dispatchId,
						packingStatus: {
							not: "unpacked",
						},
					},
					data: {
						packingStatus: "unpacked" as DispatchItemPackingStatus,
						unpackedBy: data.meta.authorName,
					},
				});
			}
			const resp = await packDispatchItemsAction(tx as any, {
				data: info,
				authorId: data.meta.authorId!,
				packItems: data.packItems,
				authorName: data.meta.authorName,
				update: true,
			});
			if (
				requestedDispatchStatus &&
				["queue", "missing items"].includes(
					requestedDispatchStatus as string,
				) &&
				(resp.created > 0 || resp.skipped > 0)
			) {
				await tx.orderDelivery.update({
					where: {
						id: data.packItems!.dispatchId,
					},
					data: {
						status: "packed" as SalesDispatchStatus,
						deliveredAt: null,
					},
				});
			}
			await resetSalesAction(tx as any, data.meta.salesId);
			return resp;
		},
	);
	return response;
}
export async function resetSalesTask(db: Db, salesId) {
	const response = await runDbTransaction(
		{
			client: db,
			operation: "sales-control.reset-sales",
			profile: "workflow",
		},
		async (tx) => {
			await resetSalesAction(tx as any, salesId);
		},
	);
}
export async function deleteSubmissionsTask(db: Db, data: UpdateSalesControl) {
	await db.$transaction(async (tx) => {
		const args = data.deleteSubmissions!;
		if (args.automaticCompletionSalesId) {
			if (args.automaticCompletionSalesId !== data.meta.salesId) {
				throw new Error(
					"Production cancellation does not match this sales order.",
				);
			}
			const submissions = await tx.orderProductionSubmissions.findMany({
				where: {
					salesOrderId: args.automaticCompletionSalesId,
					deletedAt: null,
				},
				select: {
					id: true,
					meta: true,
				},
			});
			const submissionIds = submissions
				.filter(
					(submission) =>
						submission.meta &&
						typeof submission.meta === "object" &&
						!Array.isArray(submission.meta) &&
						"source" in submission.meta &&
						submission.meta.source === "sales_mark_as_completed",
				)
				.map((submission) => submission.id);

			if (!submissionIds.length) {
				throw new Error(
					"No automatic production completion is available to cancel.",
				);
			}
			await tx.orderProductionSubmissions.updateMany({
				where: {
					id: {
						in: submissionIds,
					},
				},
				data: {
					deletedAt: new Date(),
				},
			});
		}
		if (args.submissionIds?.length)
			await tx.orderProductionSubmissions.updateMany({
				where: {
					id: {
						in: args.submissionIds,
					},
				},
				data: {
					deletedAt: new Date(),
				},
			});
		if (args.itemIds?.length)
			await tx.orderProductionSubmissions.updateMany({
				where: {
					salesOrderItemId: {
						in: args.itemIds,
					},
				},
				data: {
					deletedAt: new Date(),
				},
			});
		if (args.itemControlUids?.length)
			await tx.orderProductionSubmissions.updateMany({
				where: {
					assignment: {
						salesItemControlUid: {
							in: args.itemControlUids,
						},
					},
				},
				data: {
					deletedAt: new Date(),
				},
			});
		if (args.allBySalesId)
			await tx.orderProductionSubmissions.updateMany({
				where: {
					salesOrderId: args.allBySalesId,
				},
				data: {
					deletedAt: new Date(),
				},
			});
		await resetSalesAction(tx as any, data.meta.salesId);
	});
}
export async function updateSubmissionsTask(db: Db, data: UpdateSalesControl) {
	const updates = data.updateSubmissions?.submissions || [];
	if (!updates.length) {
		throw new Error("Unable to update, no submissions selected.");
	}

	await db.$transaction(async (tx) => {
		for (const update of updates) {
			const submission = await tx.orderProductionSubmissions.findFirst({
				where: {
					id: update.submissionId,
					deletedAt: null,
				},
				select: {
					id: true,
					note: true,
					qty: true,
					lhQty: true,
					rhQty: true,
					materialReview: {
						select: {
							status: true,
						},
					},
					assignment: {
						select: {
							id: true,
							qtyAssigned: true,
							lhQty: true,
							rhQty: true,
							submissions: {
								where: {
									deletedAt: null,
									id: {
										not: update.submissionId,
									},
								},
								select: {
									qty: true,
									lhQty: true,
									rhQty: true,
								},
							},
						},
					},
					itemDeliveries: {
						where: {
							deletedAt: null,
							packingStatus: {
								not: "unpacked" as DispatchItemPackingStatus,
							},
						},
						select: {
							qty: true,
							lhQty: true,
							rhQty: true,
						},
					},
				},
			});

			if (!submission) {
				throw new Error(`Submission #${update.submissionId} not found.`);
			}
			if (submission.materialReview?.status === "PENDING") {
				throw new Error(
					`Submission #${update.submissionId} is awaiting material review and cannot be edited.`,
				);
			}

			const assignmentQty = normalizeSubmissionQty({
				qty: submission.assignment?.qtyAssigned,
				lh: submission.assignment?.lhQty,
				rh: submission.assignment?.rhQty,
			});
			const siblingQty = normalizeSubmissionQty(
				(submission.assignment?.submissions || []).reduce(
					(total, sibling) => ({
						qty: total.qty + Number(sibling.qty || 0),
						lh: total.lh + Number(sibling.lhQty || 0),
						rh: total.rh + Number(sibling.rhQty || 0),
					}),
					{ qty: 0, lh: 0, rh: 0 },
				),
			);
			const packedQty = normalizeSubmissionQty(
				(submission.itemDeliveries || []).reduce(
					(total, item) => ({
						qty: total.qty + Number(item.qty || 0),
						lh: total.lh + Number(item.lhQty || 0),
						rh: total.rh + Number(item.rhQty || 0),
					}),
					{ qty: 0, lh: 0, rh: 0 },
				),
			);
			const currentQty = normalizeSubmissionQty({
				qty: submission.qty,
				lh: submission.lhQty,
				rh: submission.rhQty,
			});
			const isHandled = assignmentQty.lh > 0 || assignmentQty.rh > 0;
			const requestedQty = normalizeSubmissionQty(update.qty || currentQty);
			const nextQty = isHandled
				? {
						lh: requestedQty.lh,
						rh: requestedQty.rh,
						qty: requestedQty.lh + requestedQty.rh,
					}
				: {
						qty: requestedQty.qty,
						lh: 0,
						rh: 0,
					};

			if (isHandled) {
				const maxLh = Math.max(assignmentQty.lh - siblingQty.lh, 0);
				const maxRh = Math.max(assignmentQty.rh - siblingQty.rh, 0);
				if (nextQty.lh < packedQty.lh || nextQty.rh < packedQty.rh) {
					throw new Error(
						`Submission #${update.submissionId} cannot be reduced below packed quantity.`,
					);
				}
				if (nextQty.lh > maxLh || nextQty.rh > maxRh) {
					throw new Error(
						`Submission #${update.submissionId} exceeds assignment quantity.`,
					);
				}
			} else {
				const maxQty = Math.max(assignmentQty.qty - siblingQty.qty, 0);
				if (nextQty.qty < packedQty.qty) {
					throw new Error(
						`Submission #${update.submissionId} cannot be reduced below packed quantity.`,
					);
				}
				if (nextQty.qty > maxQty) {
					throw new Error(
						`Submission #${update.submissionId} exceeds assignment quantity.`,
					);
				}
			}

			await tx.orderProductionSubmissions.update({
				where: {
					id: update.submissionId,
				},
				data: {
					qty: nextQty.qty,
					lhQty: nextQty.lh || 0,
					rhQty: nextQty.rh || 0,
					note:
						update.note === undefined
							? submission.note || null
							: update.note || null,
				},
			});
		}

		await resetSalesAction(tx as any, data.meta.salesId);
	});
}
export async function deleteAssignmentsTasks(db: Db, data: UpdateSalesControl) {
	await db.$transaction(async (tx) => {
		const args = data.deleteAssignments!;
		if (args.assignmentIds?.length)
			await tx.orderItemProductionAssignments.updateMany({
				where: {
					id: {
						in: args.assignmentIds,
					},
				},
				data: {
					deletedAt: new Date(),
				},
			});
		if (args.itemIds?.length)
			await tx.orderItemProductionAssignments.updateMany({
				where: {
					itemId: {
						in: args.itemIds,
					},
				},
				data: {
					deletedAt: new Date(),
				},
			});
		if (args.itemControlUids?.length)
			await tx.orderItemProductionAssignments.updateMany({
				where: {
					salesItemControlUid: {
						in: args.itemControlUids,
					},
				},
				data: {
					deletedAt: new Date(),
				},
			});
		if (args.allBySalesId)
			await tx.orderItemProductionAssignments.updateMany({
				where: {
					orderId: args.allBySalesId,
				},
				data: {
					deletedAt: new Date(),
				},
			});
		await resetSalesAction(tx as any, data.meta.salesId);
	});
}

function normalizeSubmissionQty(qty?: {
	qty?: number | null;
	lh?: number | null;
	rh?: number | null;
}) {
	return {
		qty: Number(qty?.qty || 0),
		lh: Number(qty?.lh || 0),
		rh: Number(qty?.rh || 0),
	};
}

export async function markAsCompletedTask(
	db: Db,
	args: UpdateSalesControl,
	dependencies: SubmitAllTaskDependencies & {
		saveNoteAction?: typeof saveNote;
	} = {},
) {
	const packing = await packDispatchItemTask(
		db,
		{
			meta: args.meta,
			packItems: {
				dispatchId: args.markAsCompleted?.dispatchId!,
				packMode: "all",
				dispatchStatus: "completed",
			},
		},
		dependencies,
	);
	if (packing.created === 0) {
		const packedItemCount = await db.orderItemDelivery.count({
			where: {
				orderDeliveryId: args.markAsCompleted?.dispatchId!,
				deletedAt: null,
				packingStatus: "packed",
			},
		});
		if (packedItemCount === 0) {
			const pendingMaterialReviewCount =
				await db.orderProductionSubmissions.count({
				where: {
					salesOrderId: args.meta.salesId,
					deletedAt: null,
					materialReview: {
						status: "PENDING",
					},
				},
			});
			if (pendingMaterialReviewCount > 0) {
				throw new Error(
					"Unable to fulfill while production submissions are awaiting material review.",
				);
			}
			throw new Error(
				"Unable to fulfill because no approved items are available to pack.",
			);
		}
	}
	await submitDispatchTask(
		db,
		{
			meta: args.meta,
			submitDispatch: args.markAsCompleted,
		},
		{
			saveNoteAction: dependencies.saveNoteAction,
		},
	);
}
