import { userHasPermission } from "@gnd/auth/utils";
import { type Db, type Prisma, db } from "@gnd/db";
import { Notifications } from "@gnd/notifications";
import {
	type LegacyUpdateSalesControlAction,
	type SalesPipelineCommandDecision,
	type UpdateSalesControl,
	assertSpecialOrderOperationAllowed,
	authorizeSalesControlTaskInput,
	cancelDispatchTask,
	clearPackingTask,
	createAssignmentsTask,
	deleteAssignmentsTasks,
	deleteSubmissionsTask,
	getSalesPipelineSnapshots,
	isControlWriteV2Enabled,
	markAsCompletedTask,
	packDispatchItemTask,
	refreshSalesOrderListProjections,
	resolveLegacyUpdateSalesControlAction,
	runSalesPipelineCommandTransaction,
	salesControlTaskPermissionKeys,
	shouldEnforceCanonicalSalesPipelineCommands,
	shouldSyncInventoryProductionLifecycleForSalesControl,
	startDispatchTask,
	submitAllTask,
	submitDispatchTask,
	syncInventoryProductionLifecycleForSale,
	updateSalesControlSchema,
	updateSubmissionsTask,
} from "@gnd/sales";
import { getActionablePendingReviewIds } from "@gnd/sales/production-submission-review";
import { NotificationService } from "@notifications/services/triggers";
import { logger, schemaTask, tasks } from "@trigger.dev/sdk/v3";
import type { TaskName } from "../../schema";

type SalesControlActionHandler = (
	db: Db,
	input: UpdateSalesControl,
) => Promise<unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const actionMaps: Record<
	LegacyUpdateSalesControlAction,
	SalesControlActionHandler
> = {
	submitAll: submitAllTask,
	packItems: packDispatchItemTask,
	clearPackings: clearPackingTask,
	cancelDispatch: cancelDispatchTask,
	startDispatch: startDispatchTask,
	submitDispatch: submitDispatchTask,
	createAssignments: createAssignmentsTask,
	updateSubmissions: updateSubmissionsTask,
	deleteSubmissions: deleteSubmissionsTask,
	deleteAssignments: deleteAssignmentsTasks,
	markAsCompleted: markAsCompletedTask,
};

function resolveLegacyActionCompat(
	input: UpdateSalesControl,
): LegacyUpdateSalesControlAction | null {
	const orderedActions: LegacyUpdateSalesControlAction[] = [
		"submitAll",
		"packItems",
		"clearPackings",
		"cancelDispatch",
		"startDispatch",
		"submitDispatch",
		"createAssignments",
		"updateSubmissions",
		"deleteSubmissions",
		"deleteAssignments",
		"markAsCompleted",
	];
	for (const action of orderedActions) {
		if (input[action]) return action;
	}
	return null;
}

function resolveActionHandler(input: UpdateSalesControl) {
	if (isControlWriteV2Enabled()) {
		const mapping = resolveLegacyUpdateSalesControlAction(input);

		return mapping ? actionMaps[mapping.action] : null;
	}
	const legacyAction = resolveLegacyActionCompat(input);
	return legacyAction ? actionMaps[legacyAction] : null;
}

function resolvePipelineCommand(input: UpdateSalesControl) {
	if (input.createAssignments) return "production.assign" as const;
	if (input.deleteAssignments) return "production.unassign" as const;
	if (input.submitAll) return "production.submit" as const;
	if (input.updateSubmissions) return "production.submission.update" as const;
	if (input.deleteSubmissions) return "production.submission.delete" as const;
	if (input.packItems) return "fulfillment.pack" as const;
	if (input.clearPackings) return "fulfillment.unpack" as const;
	if (input.startDispatch) return "fulfillment.start_dispatch" as const;
	if (input.submitDispatch) return "fulfillment.complete_dispatch" as const;
	if (input.markAsCompleted) return "fulfillment.complete" as const;
	if (input.cancelDispatch) return "fulfillment.cancel" as const;
	return null;
}

async function refreshCanonicalPipelineProjection(
	input: UpdateSalesControl,
	pipelineDecision: SalesPipelineCommandDecision,
) {
	try {
		const snapshot = (
			await getSalesPipelineSnapshots(db, [input.meta.salesId])
		).get(input.meta.salesId);
		if (!snapshot) throw new Error("The committed sales order is unavailable.");
		const sourceUpdatedAt = snapshot.freshness.evidenceUpdatedAt
			? new Date(snapshot.freshness.evidenceUpdatedAt)
			: new Date();
		await refreshSalesOrderListProjections(db, [
			{ salesOrderId: input.meta.salesId, sourceUpdatedAt },
		]);
		return {
			pipelineRevision: snapshot.revision,
			affectedScopes: pipelineDecision.affectedScopes,
			projectionRefresh: "completed" as const,
		};
	} catch (error) {
		logger.error(
			"Sales pipeline command committed, but its derived projection refresh failed.",
			{ error, salesId: input.meta.salesId, action: pipelineDecision.action },
		);
		return {
			pipelineRevision: pipelineDecision.revision,
			affectedScopes: pipelineDecision.affectedScopes,
			projectionRefresh: "failed" as const,
		};
	}
}

async function enforceSpecialOrderForAction(
	client: Db,
	input: UpdateSalesControl,
) {
	const common = {
		salesOrderId: input.meta.salesId,
		actorUserId: input.meta.authorId,
		authorName: input.meta.authorName,
		source: "jobs.update-sales-control",
	};
	if (input.createAssignments || input.submitAll || input.markAsCompleted) {
		await assertSpecialOrderOperationAllowed(client, {
			...common,
			operation: "PRODUCTION",
		});
	}
	if (input.packItems || input.markAsCompleted) {
		await assertSpecialOrderOperationAllowed(client, {
			...common,
			operation: "PACKING",
		});
	}
	if (input.startDispatch || input.submitDispatch) {
		await assertSpecialOrderOperationAllowed(client, {
			...common,
			operation: "DISPATCH",
		});
	}
}

async function authorizeTaskInput(input: UpdateSalesControl) {
	const permissionEntries = await Promise.all(
		salesControlTaskPermissionKeys.map(
			async (permission) =>
				[
					permission,
					await userHasPermission(db, input.meta.authorId, permission),
				] as const,
		),
	);
	return authorizeSalesControlTaskInput(db, input, {
		userId: input.meta.authorId,
		can: Object.fromEntries(permissionEntries),
	});
}

async function sendDispatchPackedNotification(input: UpdateSalesControl) {
	if (!input.packItems?.dispatchId) return;
	const dispatchStatus = String(input.packItems.dispatchStatus || "");
	if (dispatchStatus === "completed" || dispatchStatus === "cancelled") return;

	const dispatch = await db.orderDelivery.findFirst({
		where: {
			id: input.packItems.dispatchId,
			deletedAt: null,
		},
		select: {
			id: true,
			status: true,
			dueDate: true,
			deliveryMode: true,
			driverId: true,
			order: {
				select: {
					orderId: true,
				},
			},
		},
	});
	if (!dispatch) return;
	if (dispatch.status !== "packed") return;
	const notification = new NotificationService(tasks, {
		db,
		userId: input.meta.authorId,
	});
	await notification.send("sales_dispatch_packed", {
		author: {
			id: input.meta.authorId,
			role: "employee",
		},
		payload: {
			orderNo: dispatch.order?.orderId || undefined,
			dispatchId: dispatch.id,
			deliveryMode: dispatch.deliveryMode || undefined,
			dueDate: dispatch.dueDate || undefined,
			driverId: dispatch.driverId || undefined,
		},
	} as any);
}

async function sendDispatchLifecycleNotification(input: UpdateSalesControl) {
	const dispatchIds = input.startDispatch?.dispatchId
		? [input.startDispatch.dispatchId]
		: input.cancelDispatch?.dispatchIds?.length
			? input.cancelDispatch.dispatchIds
			: input.cancelDispatch?.dispatchId
				? [input.cancelDispatch.dispatchId]
				: [];
	if (!dispatchIds.length) return;

	const dispatches = await db.orderDelivery.findMany({
		where: {
			id: {
				in: dispatchIds,
			},
			salesOrderId: input.meta.salesId,
			deletedAt: null,
		},
		select: {
			id: true,
			status: true,
			dueDate: true,
			deliveryMode: true,
			driverId: true,
			order: {
				select: {
					orderId: true,
				},
			},
		},
	});

	const isStart = Boolean(input.startDispatch?.dispatchId);
	const isCancel = Boolean(
		input.cancelDispatch?.dispatchIds?.length ||
			input.cancelDispatch?.dispatchId,
	);
	const notification = new NotificationService(tasks, {
		db,
		userId: input.meta.authorId,
	});
	for (const dispatch of dispatches) {
		if (isStart && dispatch.status !== "in progress") continue;
		if (isCancel && dispatch.status !== "cancelled") continue;
		try {
			await notification.send(
				isStart ? "sales_dispatch_in_progress" : "sales_dispatch_trip_canceled",
				{
					author: {
						id: input.meta.authorId,
						role: "employee",
					},
					payload: {
						orderNo: dispatch.order?.orderId || undefined,
						dispatchId: dispatch.id,
						deliveryMode: dispatch.deliveryMode || undefined,
						dueDate: dispatch.dueDate || undefined,
						driverId: dispatch.driverId || undefined,
					},
				} as any,
			);
		} catch (error) {
			logger.error("One dispatch lifecycle notification failed.", {
				dispatchId: dispatch.id,
				error,
				salesId: input.meta.salesId,
			});
		}
	}
}

async function sendDispatchCompletedNotification(input: UpdateSalesControl) {
	const dispatchId = input.submitDispatch?.dispatchId;
	if (!dispatchId) return;

	const dispatch = await db.orderDelivery.findFirst({
		where: {
			id: dispatchId,
			deletedAt: null,
		},
		select: {
			id: true,
			status: true,
			dueDate: true,
			deliveryMode: true,
			driverId: true,
			order: {
				select: {
					orderId: true,
				},
			},
		},
	});
	if (!dispatch) return;
	if (dispatch.status !== "completed") return;

	const notification = new NotificationService(tasks, {
		db,
		userId: input.meta.authorId,
	});
	await notification.send("sales_dispatch_completed", {
		author: {
			id: input.meta.authorId,
			role: "employee",
		},
		payload: {
			salesId: input.meta.salesId,
			orderNo: dispatch.order?.orderId || undefined,
			dispatchId: dispatch.id,
			deliveryMode: dispatch.deliveryMode || undefined,
			dueDate: dispatch.dueDate || undefined,
			driverId: dispatch.driverId || undefined,
			packedBy: input.meta.authorName || undefined,
			receivedBy: input.submitDispatch?.receivedBy || undefined,
			signature: input.submitDispatch?.signature || undefined,
			attachments: (input.submitDispatch?.attachments || [])
				.map((item) => String(item.pathname || "").trim())
				.filter(Boolean),
		},
	} as any);
}

async function sendProductionAssignedNotification(input: UpdateSalesControl) {
	const assignedToId = input.createAssignments?.assignedToId;
	if (!assignedToId) return;

	const order = await db.salesOrders.findFirst({
		where: {
			id: input.meta.salesId,
			deletedAt: null,
		},
		select: {
			id: true,
			orderId: true,
		},
	});
	if (!order) return;

	const assignedQty = (input.createAssignments?.selections || []).reduce(
		(total, selection) =>
			total +
			Number(
				selection.qty?.qty ||
					(selection.qty?.lh || 0) + (selection.qty?.rh || 0),
			),
		0,
	);

	await new Notifications(db).create(
		"sales_production_assigned",
		{
			salesId: order.id,
			orderNo: order.orderId || undefined,
			assignedToId,
			assignedQty: assignedQty || undefined,
			itemCount: input.createAssignments?.selections?.length || undefined,
			dueDate: input.createAssignments?.dueDate || undefined,
		},
		{
			author: { id: input.meta.authorId, role: "employee" },
			recipients: [{ ids: [assignedToId], role: "employee" }],
			includeChannelSubscribers: false,
			allowFallbackRecipient: false,
			forceInAppRecipients: true,
		},
	);
}

type ProductionUnassignmentEvidence = {
	id: number;
	assignedToId: number;
	assignedQty?: number;
	salesId: number;
	orderNo?: string;
};

async function loadProductionUnassignmentEvidence(
	input: UpdateSalesControl,
): Promise<ProductionUnassignmentEvidence[]> {
	const args = input.deleteAssignments;
	if (!args) return [];
	const selectors: Prisma.OrderItemProductionAssignmentsWhereInput[] = [];
	if (args.assignmentIds?.length) {
		selectors.push({ id: { in: args.assignmentIds } });
	}
	if (args.itemIds?.length) selectors.push({ itemId: { in: args.itemIds } });
	if (args.itemControlUids?.length) {
		selectors.push({ salesItemControlUid: { in: args.itemControlUids } });
	}
	if (args.allBySalesId) selectors.push({ orderId: args.allBySalesId });
	if (!selectors.length) return [];
	const assignments = await db.orderItemProductionAssignments.findMany({
		where: {
			orderId: input.meta.salesId,
			deletedAt: null,
			assignedToId: { not: null },
			OR: selectors,
		},
		select: {
			id: true,
			assignedToId: true,
			qtyAssigned: true,
			lhQty: true,
			rhQty: true,
			order: { select: { id: true, orderId: true } },
		},
	});
	return assignments.flatMap((assignment) =>
		assignment.assignedToId
			? [
					{
						id: assignment.id,
						assignedToId: assignment.assignedToId,
						assignedQty:
							assignment.qtyAssigned ||
							Number(assignment.lhQty || 0) + Number(assignment.rhQty || 0) ||
							undefined,
						salesId: assignment.order.id,
						orderNo: assignment.order.orderId || undefined,
					},
				]
			: [],
	);
}

async function sendProductionUnassignedNotifications(
	input: UpdateSalesControl,
	evidence: ProductionUnassignmentEvidence[],
) {
	const notifications = new Notifications(db);
	for (const assignment of evidence) {
		await notifications.create(
			"sales_production_unassigned",
			{
				salesId: assignment.salesId,
				orderNo: assignment.orderNo,
				assignmentId: assignment.id,
				assignedToId: assignment.assignedToId,
				assignedQty: assignment.assignedQty,
			},
			{
				author: { id: input.meta.authorId, role: "employee" },
				recipients: [{ ids: [assignment.assignedToId], role: "employee" }],
				includeChannelSubscribers: false,
				allowFallbackRecipient: false,
				forceInAppRecipients: true,
			},
		);
	}
}

async function sendProductionSubmittedNotification(
	input: UpdateSalesControl,
	response: unknown,
) {
	if (
		!input.submitAll ||
		!isRecord(response) ||
		response.idempotentReplay === true
	) {
		return;
	}
	const reviewId = Number(response.reviewId || 0);
	const order = await db.salesOrders.findFirst({
		where: { id: input.meta.salesId, deletedAt: null },
		select: { id: true, orderId: true, salesRepId: true },
	});
	if (!order?.salesRepId) return;
	const submissions = reviewId
		? await db.orderProductionSubmissions.findMany({
				where: { materialReviewId: reviewId, deletedAt: null },
				select: { qty: true },
			})
		: [];
	const submittedQty = submissions.reduce(
		(total, submission) => total + Number(submission.qty || 0),
		0,
	);
	await new Notifications(db).create(
		"sales_production_submitted",
		{
			salesId: order.id,
			orderNo: order.orderId || undefined,
			salesRepId: order.salesRepId,
			submittedById: input.meta.authorId,
			submittedByName: input.meta.authorName || undefined,
			submittedQty,
		},
		{
			author: { id: input.meta.authorId, role: "employee" },
			recipients: [{ ids: [order.salesRepId], role: "employee" }],
			includeChannelSubscribers: false,
			allowFallbackRecipient: false,
			forceInAppRecipients: true,
		},
	);
}

async function sendProductionMaterialReviewNotification(
	input: UpdateSalesControl,
	response: unknown,
) {
	if (
		!input.submitAll ||
		!isRecord(response) ||
		response.state !== "pending_material_review" ||
		response.idempotentReplay === true ||
		!Number.isInteger(response.reviewId)
	) {
		return;
	}
	const reviewId = response.reviewId as number;
	const actionableReviews = await getActionablePendingReviewIds(db, {
		id: reviewId,
	});
	const currentActionability = actionableReviews.get(reviewId);
	if (!currentActionability) return;
	const review = await db.salesProductionSubmissionMaterialReview.findUnique({
		where: { id: reviewId },
		select: {
			id: true,
			classificationReason: true,
			materialSnapshot: true,
			materialRevision: true,
			order: {
				select: { id: true, orderId: true, salesRepId: true },
			},
			submittedBy: {
				select: { id: true, name: true },
			},
			submissions: {
				where: { deletedAt: null },
				select: { qty: true },
			},
		},
	});
	if (!review?.order.salesRepId) return;
	const materialSnapshot = Array.isArray(review.materialSnapshot)
		? review.materialSnapshot
		: [];
	const unresolvedMaterials = materialSnapshot.filter(
		(material): material is Record<string, unknown> => {
			if (!isRecord(material)) return false;
			const readiness = String(material.readiness || "");
			return readiness !== "ready_for_production" && readiness !== "fulfilled";
		},
	);
	const expectedAt =
		unresolvedMaterials
			.map((material) =>
				typeof material.expectedAt === "string" ? material.expectedAt : null,
			)
			.filter((value): value is string => Boolean(value))
			.sort()
			.at(-1) ?? null;
	const notification = new Notifications(db);
	await notification.create(
		"sales_production_submission_material_review",
		{
			reviewId: review.id,
			salesId: review.order.id,
			orderNo: review.order.orderId || undefined,
			workerId: review.submittedBy.id,
			workerName: review.submittedBy.name || undefined,
			submittedQty: review.submissions.reduce(
				(total, submission) => total + submission.qty,
				0,
			),
			reason: review.classificationReason || "NOT_CONFIGURED",
			pendingMaterialCount: unresolvedMaterials.length,
			expectedAt,
			classification: currentActionability.actionability.classification,
			classificationVersion: currentActionability.actionability.version,
			evidenceRevision: review.materialRevision,
		},
		{
			author: { id: input.meta.authorId, role: "employee" },
			recipients: [{ ids: [review.order.salesRepId], role: "employee" }],
			includeChannelSubscribers: false,
			allowFallbackRecipient: false,
			forceInAppRecipients: true,
		},
	);
}

export const updateSalesControl = schemaTask({
	id: "update-sales-control" as TaskName,
	schema: updateSalesControlSchema,
	maxDuration: 120,
	queue: {
		concurrencyLimit: 10,
	},
	run: async (input) => {
		const authorizedInput = await authorizeTaskInput(
			input as UpdateSalesControl,
		);
		const action = resolveActionHandler(authorizedInput);
		if (action) {
			const pipelineCommand = resolvePipelineCommand(authorizedInput);
			if (!pipelineCommand) throw new Error("Invalid pipeline action");
			const unassignmentEvidence = authorizedInput.deleteAssignments
				? await loadProductionUnassignmentEvidence(authorizedInput)
				: [];
			const execution = await runSalesPipelineCommandTransaction(
				db,
				{
					salesOrderId: authorizedInput.meta.salesId,
					action: pipelineCommand,
					authorized: true,
					expectedRevision: authorizedInput.meta.pipelineRevision,
					enforce: shouldEnforceCanonicalSalesPipelineCommands(
						authorizedInput.meta.salesId,
					),
					operation: `jobs.update-sales-control.${pipelineCommand}`,
				},
				async (transactionDb) => {
					await enforceSpecialOrderForAction(transactionDb, authorizedInput);
					const response = await action(transactionDb, authorizedInput);
					if (
						shouldSyncInventoryProductionLifecycleForSalesControl(
							authorizedInput,
						)
					) {
						await syncInventoryProductionLifecycleForSale(
							transactionDb as any,
							authorizedInput.meta.salesId,
						);
					}
					return response;
				},
			);
			if (!execution.executed) {
				return {
					state: "replayed",
					idempotentReplay: true,
					pipelineRevision: execution.decision.revision,
					reasons: execution.decision.reasons,
				};
			}
			const response = execution.value;
			const pipelineResult = await refreshCanonicalPipelineProjection(
				authorizedInput,
				execution.decision,
			);
			if (authorizedInput.packItems) {
				try {
					await sendDispatchPackedNotification(authorizedInput);
				} catch (error) {
					logger.error(
						"Sales control committed, but its packed notification failed.",
						{ error, salesId: authorizedInput.meta.salesId },
					);
				}
			}
			if (authorizedInput.startDispatch || authorizedInput.cancelDispatch) {
				try {
					await sendDispatchLifecycleNotification(authorizedInput);
				} catch (error) {
					logger.error(
						"Sales control committed, but its dispatch notification failed.",
						{
							error,
							salesId: authorizedInput.meta.salesId,
						},
					);
				}
			}
			if (authorizedInput.submitDispatch) {
				try {
					await sendDispatchCompletedNotification(authorizedInput);
				} catch (error) {
					logger.error(
						"Sales control committed, but its completed notification failed.",
						{ error, salesId: authorizedInput.meta.salesId },
					);
				}
			}
			if (authorizedInput.createAssignments) {
				try {
					await sendProductionAssignedNotification(authorizedInput);
				} catch (error) {
					logger.error(
						"Production assignment committed, but its notification failed.",
						{ error, salesId: authorizedInput.meta.salesId },
					);
				}
			}
			if (authorizedInput.deleteAssignments && unassignmentEvidence.length) {
				try {
					await sendProductionUnassignedNotifications(
						authorizedInput,
						unassignmentEvidence,
					);
				} catch (error) {
					logger.error(
						"Production unassignment committed, but its notification failed.",
						{ error, salesId: authorizedInput.meta.salesId },
					);
				}
			}
			if (authorizedInput.submitAll) {
				try {
					await sendProductionSubmittedNotification(authorizedInput, response);
					await sendProductionMaterialReviewNotification(
						authorizedInput,
						response,
					);
				} catch (error) {
					logger.error(
						"Production submission committed, but its material review notification failed.",
						{
							error,
							salesId: authorizedInput.meta.salesId,
						},
					);
				}
			}
			return pipelineResult && response && typeof response === "object"
				? { ...response, ...pipelineResult }
				: response;
		}
		throw new Error("Invalid action");
	},
});
