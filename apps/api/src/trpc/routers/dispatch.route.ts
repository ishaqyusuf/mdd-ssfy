import {
	bulkAssignDispatchDriver,
	bulkCancelDispatches,
	deleteDispatch,
	exportDispatches,
	findDuplicateDispatchGroups,
	getDeletedDispatches,
	getDispatchOverview,
	getDispatchOverviewV2,
	getDispatchSummary,
	getDispatches,
	getDriverWorkQueueSummary,
	getFulfillmentCalendar,
	getPackingList,
	getPackingListSummary,
	getPackingQueue,
	getSalesDeliveryInfo,
	resolveDuplicateDispatchGroup,
	restoreDispatch,
	sendSaleForPickup,
	signPackingSlip,
	updateDispatchDriver,
	updateDispatchDueDate,
	updateDispatchStatus,
	updateSalesDeliveryOption,
} from "@api/db/queries/dispatch";
import { prepareAndPickDispatchInventory } from "@api/db/queries/dispatch-inventory-actions";
import {
	backfillDispatchInventoryBindings,
	getDispatchInventoryReconciliation,
} from "@api/db/queries/dispatch-inventory-reconciliation";
import {
	DispatchPackingCommandError,
	confirmDispatchPacking,
	getDispatchPackingCommandRevision,
	resetDispatchPacking,
} from "@api/db/queries/dispatch-packing-command";
import {
	type DispatchCompletionProof,
	buildDispatchSignatureSvg,
	canResignPackingSlip,
	completeDispatchWithProofSchema,
	createDispatchCompletionProof,
	decodePngSignatureDataUrl,
	getDispatchCompletionPayloadFingerprint,
	getDispatchCompletionProof,
	getDispatchProofFilename,
	isDispatchCompletionProofStale,
	mergeDispatchCompletionProof,
} from "@api/db/queries/dispatch-proof-completion";
import {
	getDispatchBacklog,
	getDispatchDriverWorkload,
	getDispatchExceptions,
	getDispatchWorkspaceSummary,
	reportDispatchException,
	resolveDispatchException,
} from "@api/db/queries/dispatch-workspace";
import { auth } from "@api/db/queries/user";
import {
	dispatchBacklogSchema,
	dispatchExceptionListSchema,
	dispatchWorkspaceDetailSchema,
	dispatchWorkspaceListSchema,
	fulfillmentCalendarSchema,
	reportDispatchExceptionSchema,
	resolveDispatchExceptionSchema,
} from "@api/schemas/dispatch-workspace";
import {
	bulkAssignDriverSchema,
	bulkCancelDispatchSchema,
	dispatchQueryParamsSchema,
	driverWorkQueueQuerySchema,
	exportDispatchesSchema,
	packingListQuerySchema,
	resolveDuplicateDispatchGroupSchema,
	salesDispatchOverviewSchema,
	sendSaleForPickupSchema,
	signPackingSlipSchema,
	updateDispatchDriverSchema,
	updateDispatchDueDateSchema,
	updateDispatchStatusSchema,
	updateSalesDeliveryOptionSchema,
} from "@api/schemas/sales";
import { createApiVercelBlobDocumentService } from "@api/utils/documents";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";
import { sendPackingReportNotification } from "@api/utils/packing-report-notification";
import { assertSpecialOrderOperationAllowedForApi } from "@api/utils/special-order-enforcement";
import { registerStoredDocumentUpload } from "@api/utils/stored-documents";
import { finalizeUploadedDocument } from "@api/utils/upload-finalization";
import { decodeValidatedDocumentBase64 } from "@api/utils/upload-validation";
import type { Db, TransactionClient } from "@gnd/db";
import type { DevLogEntry } from "@gnd/dev-logger";
import { buildOwnerDocumentFolder } from "@gnd/documents";
import {
	assertDispatchInventoryReadyToStart,
	consumeDispatchBoundInventory,
	releaseDispatchBoundInventory,
} from "@gnd/sales/sales-fulfillment-plan";
import { isDispatchProgressionTransition } from "@gnd/sales/special-order";
import type { DeliveryOption } from "@gnd/utils/sales";
import { NotificationService } from "@notifications/services/triggers";
import {
	cancelDispatchTask,
	createDispatchSchema,
	deletePackingItem,
	deletePackingSchema,
	getSalesDispatchOverview,
	normalizeSalesControlTaskActor,
	packDispatchItemTask,
	startDispatchTask,
	submitDispatchTask,
	submitNonProductionsTask,
	updateSalesControlSchema,
} from "@sales/exports";
import type { UpdateSalesControl } from "@sales/exports";
import type { SalesDispatchStatus } from "@sales/types";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { del, put } from "@vercel/blob";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import type { TRPCContext } from "../init";

function getDispatchNotificationService(ctx: TRPCContext) {
	return new NotificationService(tasks, {
		db: ctx.db,
		userId: ctx.userId,
	});
}

function normalizeDispatchDeliveryMode(value: string | null | undefined) {
	return value === "pickup" || value === "delivery" ? value : undefined;
}

function asJsonRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

const PACKING_SIGNOFF_LEASE_MS = 60 * 60 * 1000;

const dispatchPackingQuantitySchema = z
	.object({
		qty: z.number().int().nonnegative().optional().default(0),
		lh: z.number().int().nonnegative().optional().default(0),
		rh: z.number().int().nonnegative().optional().default(0),
	})
	.strict()
	.superRefine((value, ctx) => {
		if (value.qty > 0 && (value.lh > 0 || value.rh > 0)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Use either single quantity or LH/RH quantities.",
			});
		}
		if (value.qty + value.lh + value.rh <= 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Packing quantity must be greater than zero.",
			});
		}
	});

const confirmDispatchPackingSchema = z
	.object({
		dispatchId: z.number().int().positive(),
		requestId: z.string().trim().min(8).max(128),
		expectedManifestRevision: z.string().trim().min(16).max(128),
		replaceExisting: z.boolean().default(false),
		items: z
			.array(
				z
					.object({
						salesItemId: z.number().int().positive(),
						itemUid: z.string().trim().min(1).max(128).optional().nullable(),
						title: z.string().trim().min(1).max(500).optional().nullable(),
						qty: dispatchPackingQuantitySchema,
						note: z.string().trim().max(2_000).optional().nullable(),
					})
					.strict(),
			)
			.min(1)
			.max(250),
	})
	.strict();

const resetDispatchPackingSchema = z
	.object({
		dispatchId: z.number().int().positive(),
		requestId: z.string().trim().min(8).max(128),
		expectedManifestRevision: z.string().trim().min(16).max(128),
	})
	.strict();

const startDispatchTripSchema = z
	.object({
		dispatchId: z.number().int().positive(),
		requestId: z.string().trim().min(8).max(128),
	})
	.strict();

function dispatchPackingTrpcError(error: unknown): never {
	if (!(error instanceof DispatchPackingCommandError)) throw error;
	const code =
		error.code === "INVALID_SCOPE"
			? "FORBIDDEN"
			: error.code === "TERMINAL_DISPATCH"
				? "PRECONDITION_FAILED"
				: "CONFLICT";
	throw new TRPCError({ code, message: error.message, cause: error });
}

function assertMobilePackingCommandsEnabled() {
	if (process.env.MOBILE_DISPATCH_PACKING_COMMANDS_ENABLED === "false") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Mobile packing updates are temporarily paused. Refresh for read-only status.",
		});
	}
}

async function getMobileDispatchProjection(
	ctx: TRPCContext & { userId: number },
	dispatchId: number,
	session: Awaited<ReturnType<typeof auth>>,
) {
	const [
		overview,
		packingCommandRevision,
		pendingReportCount,
		openExceptionCount,
	] = await Promise.all([
		getDispatchOverviewV2(ctx, { dispatchId }),
		getDispatchPackingCommandRevision(ctx.db, dispatchId),
		ctx.db.salesPackingReport.count({
			where: { orderDeliveryId: dispatchId, status: "PENDING" },
		}),
		ctx.db.dispatchException.count({
			where: { orderDeliveryId: dispatchId, status: "open", deletedAt: null },
		}),
	]);
	const dispatch = overview.dispatch;
	const status = String(dispatch?.status || "");
	const assigned = Number(dispatch?.driver?.id || 0) === ctx.userId;
	const manager = Boolean(session.can.editPickup || session.can.editOrders);
	const packingOperator = Boolean(
		session.can.viewPacking || session.can.editPickup || session.can.editOrders,
	);
	const activeActor = assigned || manager;
	const packingActor = activeActor || packingOperator;
	const terminal = ["completed", "delivered", "cancelled"].includes(status);
	const preTrip = [
		"queue",
		"packing",
		"packing queue",
		"missing items",
		"packed",
	].includes(status);
	const readinessBlocked = overview.dispatchReadiness?.canDispatch === false;
	const startBlockers = [
		...(status !== "packed" ? ["TRIP_NOT_READY"] : []),
		...(pendingReportCount ? ["PACKING_REVIEW_PENDING"] : []),
		...(readinessBlocked ? ["DISPATCH_NOT_READY"] : []),
		...(!assigned && !manager ? ["NOT_ASSIGNED"] : []),
	];
	const packingBlockers = [
		...(pendingReportCount ? ["PACKING_REVIEW_PENDING"] : []),
		...(!preTrip
			? [terminal ? "TERMINAL_DISPATCH" : "TRIP_ALREADY_STARTED"]
			: []),
		...(!packingActor ? ["PACKING_PERMISSION_REQUIRED"] : []),
	];
	const completionBlockers = [
		...(status !== "in progress" ? ["TRIP_NOT_IN_PROGRESS"] : []),
		...(!activeActor ? ["NOT_ASSIGNED"] : []),
	];
	const risks = [
		...(overview.dispatch?.dueBucket === "overdue" ? ["overdue"] : []),
		...(!overview.dispatch?.dueDate ? ["unscheduled"] : []),
		...(status === "missing items" ? ["missing_items"] : []),
		...(openExceptionCount ? ["open_exception"] : []),
	];
	return {
		...overview,
		packingCommandRevision,
		mobileLifecycle: {
			stage: status || "unknown",
			risks,
			pendingPackingReportCount: pendingReportCount,
			capabilities: {
				canStartTrip:
					activeActor && status === "packed" && startBlockers.length === 0,
				canComplete: activeActor && status === "in progress",
				canReportException: activeActor && !terminal,
				canEditPacking: packingActor && packingBlockers.length === 0,
				canResetPacking: manager && packingBlockers.length === 0,
				canOpenWarehousePacking: packingOperator,
			},
			blockers: {
				startTrip: startBlockers,
				packing: packingBlockers,
				completion: completionBlockers,
			},
		},
	};
}

async function requireDispatchManager(ctx: TRPCContext) {
	return requireAnyOperationalPermission(
		ctx,
		["editPickup", "editOrders"],
		"You do not have permission to manage dispatches.",
	);
}

async function requirePackingOperator(ctx: TRPCContext) {
	return requireAnyOperationalPermission(
		ctx,
		["viewPacking", "editPickup", "editOrders"],
		"You do not have permission to manage packing.",
	);
}

async function requireDispatchWorker(ctx: TRPCContext) {
	return requireAnyOperationalPermission(
		ctx,
		["viewDelivery", "editDelivery", "viewPickup", "editPickup", "viewPacking"],
		"You do not have permission to update dispatch proof.",
	);
}

function withAuthenticatedSalesControlActor(
	input: UpdateSalesControl,
	actor: Awaited<ReturnType<typeof auth>>,
) {
	return normalizeSalesControlTaskActor(input, {
		userId: actor.id,
		name: actor.name,
		canEditProduction: Boolean(actor.can.editProduction),
	});
}

async function enforceSpecialOrderForSale(
	ctx: TRPCContext,
	salesOrderId: number,
	operation: "PRODUCTION" | "PACKING" | "DISPATCH",
	source: string,
) {
	return assertSpecialOrderOperationAllowedForApi(ctx.db, {
		salesOrderId,
		operation,
		actorUserId: ctx.userId,
		authorName: `User ${ctx.userId}`,
		source,
	});
}

async function enforceSpecialOrderForDispatch(
	ctx: TRPCContext,
	dispatchId: number,
	operation: "PACKING" | "DISPATCH",
	source: string,
	nextStatus?: SalesDispatchStatus,
) {
	const dispatch = await ctx.db.orderDelivery.findFirst({
		where: { id: dispatchId, deletedAt: null },
		select: { salesOrderId: true, status: true },
	});
	if (!dispatch) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Dispatch not found." });
	}
	if (
		operation === "DISPATCH" &&
		nextStatus &&
		!isDispatchProgressionTransition(
			dispatch.status as SalesDispatchStatus,
			nextStatus,
		)
	) {
		return;
	}
	return enforceSpecialOrderForSale(
		ctx,
		dispatch.salesOrderId,
		operation,
		source,
	);
}

async function requireAssignedDispatchOrManager(
	ctx: TRPCContext & { userId: number },
	dispatchId: number | null | undefined,
	options?: { allowPackingOperator?: boolean },
) {
	const session = await auth(ctx);
	if (session.can.editPickup || session.can.editOrders) {
		return session;
	}
	if (options?.allowPackingOperator && session.can.viewPacking) return session;
	if (
		!session.can.viewDelivery &&
		!session.can.viewPickup &&
		!(options?.allowPackingOperator && session.can.viewPacking)
	) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You do not have permission to update this dispatch.",
		});
	}
	const dispatch = dispatchId
		? await ctx.db.orderDelivery.findFirst({
				where: {
					id: dispatchId,
					deletedAt: null,
				},
				select: {
					driverId: true,
				},
			})
		: null;
	if (dispatch?.driverId === ctx.userId) return session;
	throw new TRPCError({
		code: "FORBIDDEN",
		message:
			"Only the assigned driver or a dispatch manager can update this trip.",
	});
}

export const dispatchRouters = createTRPCRouter({
	workspaceSummary: protectedProcedure.query(async (props) => {
		await requireDispatchManager(props.ctx);
		return getDispatchWorkspaceSummary(props.ctx);
	}),
	backlog: protectedProcedure
		.input(dispatchBacklogSchema)
		.query(async (props) => {
			await requireDispatchManager(props.ctx);
			return getDispatchBacklog(props.ctx, props.input);
		}),
	list: protectedProcedure
		.input(dispatchWorkspaceListSchema)
		.query(async (props) => {
			await requireDispatchManager(props.ctx);
			const { section: _section, ...input } = props.input;
			return getDispatches(props.ctx, input);
		}),
	calendar: protectedProcedure
		.input(dispatchWorkspaceListSchema)
		.query(async (props) => {
			await requireDispatchManager(props.ctx);
			const { section: _section, ...input } = props.input;
			return getDispatches(props.ctx, input);
		}),
	fulfillmentCalendar: protectedProcedure
		.input(fulfillmentCalendarSchema)
		.query(async (props) => {
			await requireDispatchManager(props.ctx);
			return getFulfillmentCalendar(props.ctx, props.input);
		}),
	driverWorkload: protectedProcedure.query(async (props) => {
		await requireDispatchManager(props.ctx);
		return getDispatchDriverWorkload(props.ctx);
	}),
	exceptions: protectedProcedure
		.input(dispatchExceptionListSchema)
		.query(async (props) => {
			await requireDispatchManager(props.ctx);
			return getDispatchExceptions(props.ctx, props.input);
		}),
	detail: protectedProcedure
		.input(dispatchWorkspaceDetailSchema)
		.query(async (props) => {
			const session = await requireAssignedDispatchOrManager(
				props.ctx,
				props.input.dispatchId,
				{ allowPackingOperator: true },
			);
			const [overview, exceptions] = await Promise.all([
				getMobileDispatchProjection(props.ctx, props.input.dispatchId, session),
				props.ctx.db.dispatchException.findMany({
					where: {
						orderDeliveryId: props.input.dispatchId,
						deletedAt: null,
					},
					orderBy: [{ reportedAt: "desc" }, { id: "desc" }],
				}),
			]);
			return { overview, exceptions };
		}),
	driverManifest: protectedProcedure
		.input(driverWorkQueueQuerySchema)
		.query(async (props) => {
			await requireDispatchWorker(props.ctx);
			const input = {
				...props.input,
				driversId: [props.ctx.userId],
			};
			const [queue, summary] = await Promise.all([
				getDispatches(props.ctx, input),
				getDriverWorkQueueSummary(props.ctx, input),
			]);
			const nextStop = queue.data.find(
				(row) => !["completed", "cancelled"].includes(String(row.status)),
			);
			return { queue, summary, nextStop: nextStop || null };
		}),
	reportException: protectedProcedure
		.input(reportDispatchExceptionSchema)
		.mutation(async (props) => {
			await requireAssignedDispatchOrManager(props.ctx, props.input.dispatchId);
			return reportDispatchException(props.ctx, props.input);
		}),
	resolveException: protectedProcedure
		.input(resolveDispatchExceptionSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return resolveDispatchException(props.ctx, props.input);
		}),
	index: protectedProcedure
		.input(dispatchQueryParamsSchema)
		.query(async (props) => {
			await requireDispatchManager(props.ctx);
			return getDispatches(props.ctx, props.input);
		}),
	assignedDispatch: protectedProcedure
		.input(dispatchQueryParamsSchema)
		.query(async (props) => {
			await requireDispatchWorker(props.ctx);
			return getDispatches(props.ctx, {
				...props.input,
				driversId: [props.ctx.userId],
			});
		}),
	driverWorkQueue: protectedProcedure
		.input(driverWorkQueueQuerySchema)
		.query(async (props) => {
			await requireDispatchWorker(props.ctx);
			return getDispatches(props.ctx, {
				...props.input,
				driversId: [props.ctx.userId],
			});
		}),
	driverWorkQueueSummary: protectedProcedure
		.input(driverWorkQueueQuerySchema)
		.query(async (props) => {
			await requireDispatchWorker(props.ctx);
			return getDriverWorkQueueSummary(props.ctx, {
				...props.input,
				driversId: [props.ctx.userId],
			});
		}),
	deletePackingItem: protectedProcedure
		.input(deletePackingSchema)
		.mutation(async (props) => {
			const actor = await requirePackingOperator(props.ctx);
			return deletePackingItem(
				props.ctx.db,
				props.input,
				actor.name || "Packing operator",
			);
		}),
	cancelDispatch: protectedProcedure
		.input(updateSalesControlSchema)
		.mutation(async (props) => {
			const actor = await requireDispatchManager(props.ctx);
			const input = withAuthenticatedSalesControlActor(props.input, actor);
			const response = await cancelDispatchTask(props.ctx.db, input, {
				releaseDispatchInventory: (tx, input) =>
					releaseDispatchBoundInventory(tx, input),
			});
			const dispatchIds = input.cancelDispatch?.dispatchIds?.length
				? input.cancelDispatch.dispatchIds
				: input.cancelDispatch?.dispatchId
					? [input.cancelDispatch.dispatchId]
					: [];
			try {
				if (dispatchIds.length) {
					const dispatches = await props.ctx.db.orderDelivery.findMany({
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
					for (const dispatch of dispatches) {
						if (dispatch.status === "cancelled") {
							try {
								await getDispatchNotificationService(props.ctx).send(
									"sales_dispatch_trip_canceled",
									{
										payload: {
											orderNo: dispatch.order?.orderId || undefined,
											dispatchId: dispatch.id,
											deliveryMode: normalizeDispatchDeliveryMode(
												dispatch.deliveryMode,
											),
											dueDate: dispatch.dueDate || undefined,
											driverId: dispatch.driverId || undefined,
										},
									},
								);
							} catch (error) {
								console.error(
									"Dispatch cancellation committed, but one notification failed.",
									{
										dispatchId: dispatch.id,
										error,
									},
								);
							}
						}
					}
				}
			} catch (error) {
				console.error(
					"Dispatch cancellation committed, but notifications could not be loaded.",
					error,
				);
			}
			return response;
		}),
	startDispatch: protectedProcedure
		.input(updateSalesControlSchema)
		.mutation(async (props) => {
			const actor = await requireAssignedDispatchOrManager(
				props.ctx,
				props.input.startDispatch?.dispatchId,
			);
			const input = withAuthenticatedSalesControlActor(props.input, actor);
			await enforceSpecialOrderForSale(
				props.ctx,
				input.meta.salesId,
				"DISPATCH",
				"api.dispatch.start",
			);
			const response = await startDispatchTask(props.ctx.db, input, {
				assertInventoryReady: assertDispatchInventoryReadyToStart,
			});
			const dispatchId = input.startDispatch?.dispatchId;
			if (dispatchId) {
				const dispatch = await props.ctx.db.orderDelivery.findFirst({
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
				if (dispatch?.status === "in progress") {
					await getDispatchNotificationService(props.ctx).send(
						"sales_dispatch_in_progress",
						{
							payload: {
								orderNo: dispatch.order?.orderId || undefined,
								dispatchId: dispatch.id,
								deliveryMode: normalizeDispatchDeliveryMode(
									dispatch.deliveryMode,
								),
								dueDate: dispatch.dueDate || undefined,
								driverId: dispatch.driverId || undefined,
							},
						},
					);
				}
			}
			return response;
		}),
	startTrip: protectedProcedure
		.input(startDispatchTripSchema)
		.mutation(async (props) => {
			const actor = await requireAssignedDispatchOrManager(
				props.ctx,
				props.input.dispatchId,
			);
			const dispatch = await props.ctx.db.orderDelivery.findFirst({
				where: { id: props.input.dispatchId, deletedAt: null },
				select: {
					id: true,
					salesOrderId: true,
					status: true,
					dueDate: true,
					deliveryMode: true,
					driverId: true,
					order: { select: { orderId: true } },
				},
			});
			if (!dispatch) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Dispatch not found.",
				});
			}
			if (dispatch.status === "in progress") {
				return {
					result: null,
					requestId: props.input.requestId,
					status: dispatch.status,
					idempotent: true,
				};
			}
			await enforceSpecialOrderForSale(
				props.ctx,
				dispatch.salesOrderId,
				"DISPATCH",
				"api.dispatch.start-trip",
			);
			const input = withAuthenticatedSalesControlActor(
				{
					meta: {
						salesId: dispatch.salesOrderId,
						authorId: actor.id,
						authorName: actor.name || `User ${props.ctx.userId}`,
					},
					startDispatch: { dispatchId: dispatch.id },
				},
				actor,
			);
			const response = await startDispatchTask(props.ctx.db, input, {
				assertInventoryReady: assertDispatchInventoryReadyToStart,
			});
			const current = await props.ctx.db.orderDelivery.findFirst({
				where: { id: dispatch.id, deletedAt: null },
				select: { status: true },
			});
			let notificationFailed = false;
			if (
				current?.status === "in progress" &&
				dispatch.status !== "in progress"
			) {
				try {
					await getDispatchNotificationService(props.ctx).send(
						"sales_dispatch_in_progress",
						{
							payload: {
								orderNo: dispatch.order?.orderId || undefined,
								dispatchId: dispatch.id,
								deliveryMode: normalizeDispatchDeliveryMode(
									dispatch.deliveryMode,
								),
								dueDate: dispatch.dueDate || undefined,
								driverId: dispatch.driverId || undefined,
							},
						},
					);
				} catch (error) {
					notificationFailed = true;
					console.error(
						"Trip start committed, but notification failed.",
						error,
					);
				}
			}
			return {
				result: response ?? null,
				requestId: props.input.requestId,
				status: current?.status || dispatch.status,
				idempotent: false,
				notificationFailed,
			};
		}),
	confirmPacking: protectedProcedure
		.input(confirmDispatchPackingSchema)
		.mutation(async (props) => {
			assertMobilePackingCommandsEnabled();
			const session = await requireAssignedDispatchOrManager(
				props.ctx,
				props.input.dispatchId,
				{ allowPackingOperator: true },
			);
			const dispatch = await props.ctx.db.orderDelivery.findFirst({
				where: { id: props.input.dispatchId, deletedAt: null },
				select: {
					salesOrderId: true,
					driverId: true,
					dueDate: true,
					deliveryMode: true,
					order: { select: { orderId: true } },
				},
			});
			if (!dispatch) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Dispatch not found.",
				});
			}
			await enforceSpecialOrderForSale(
				props.ctx,
				dispatch.salesOrderId,
				"PACKING",
				"api.dispatch.confirm-packing",
			);
			const roleScope = Boolean(
				session.can.viewPacking ||
					session.can.editPickup ||
					session.can.editOrders,
			);
			try {
				const result = await confirmDispatchPacking(props.ctx.db, props.input, {
					id: props.ctx.userId,
					name: session.name || `User ${props.ctx.userId}`,
					scope: roleScope ? "role" : "assignment",
					canReleasePicked: Boolean(
						session.can.editPickup || session.can.editOrders,
					),
				});
				const notificationResults = await Promise.all(
					result.pendingReportIds.map((reportId) =>
						sendPackingReportNotification(
							props.ctx,
							reportId,
							"PENDING",
							props.ctx.userId,
						),
					),
				);
				if (!result.idempotent && result.status === "packed") {
					try {
						await getDispatchNotificationService(props.ctx).send(
							"sales_dispatch_packed",
							{
								payload: {
									orderNo: dispatch.order?.orderId || undefined,
									dispatchId: props.input.dispatchId,
									deliveryMode: normalizeDispatchDeliveryMode(
										dispatch.deliveryMode,
									),
									dueDate: dispatch.dueDate || undefined,
									driverId: dispatch.driverId || undefined,
								},
							},
						);
					} catch (error) {
						notificationResults.push({
							sent: false,
							reason: error instanceof Error ? error.message : "unknown",
						});
					}
				}
				return {
					...result,
					notificationFailures: notificationResults.filter(
						(entry) => !entry.sent,
					).length,
				};
			} catch (error) {
				dispatchPackingTrpcError(error);
			}
		}),
	resetPacking: protectedProcedure
		.input(resetDispatchPackingSchema)
		.mutation(async (props) => {
			assertMobilePackingCommandsEnabled();
			const actor = await requireDispatchManager(props.ctx);
			const dispatch = await props.ctx.db.orderDelivery.findFirst({
				where: { id: props.input.dispatchId, deletedAt: null },
				select: {
					salesOrderId: true,
					dueDate: true,
					deliveryMode: true,
					driverId: true,
					order: { select: { orderId: true } },
				},
			});
			if (!dispatch) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Dispatch not found.",
				});
			}
			await enforceSpecialOrderForSale(
				props.ctx,
				dispatch.salesOrderId,
				"PACKING",
				"api.dispatch.reset-packing",
			);
			try {
				const result = await resetDispatchPacking(props.ctx.db, props.input, {
					id: props.ctx.userId,
					name: actor.name || `User ${props.ctx.userId}`,
				});
				let notificationFailed = false;
				try {
					if (result.idempotent) {
						return { ...result, notificationFailed };
					}
					await getDispatchNotificationService(props.ctx).send(
						"sales_dispatch_packing_reset",
						{
							payload: {
								orderNo: dispatch.order?.orderId || undefined,
								dispatchId: props.input.dispatchId,
								deliveryMode: normalizeDispatchDeliveryMode(
									dispatch.deliveryMode,
								),
								dueDate: dispatch.dueDate || undefined,
								driverId: dispatch.driverId || undefined,
							},
						},
					);
				} catch (error) {
					notificationFailed = true;
					console.error(
						"Packing reset committed, but notification failed.",
						error,
					);
				}
				return { ...result, notificationFailed };
			} catch (error) {
				dispatchPackingTrpcError(error);
			}
		}),
	submitDispatch: protectedProcedure
		.input(updateSalesControlSchema)
		.mutation(async (props) => {
			const actor = await requireAssignedDispatchOrManager(
				props.ctx,
				props.input.submitDispatch?.dispatchId,
			);
			const input = withAuthenticatedSalesControlActor(props.input, actor);
			await enforceSpecialOrderForSale(
				props.ctx,
				input.meta.salesId,
				"DISPATCH",
				"api.dispatch.submit",
			);
			return submitDispatchTask(props.ctx.db, input);
		}),
	completeDispatchWithProof: protectedProcedure
		.input(completeDispatchWithProofSchema)
		.mutation(async (props) => {
			const session = await requireAssignedDispatchOrManager(
				props.ctx,
				props.input.dispatchId,
			);
			const dispatch = await props.ctx.db.orderDelivery.findFirst({
				where: {
					id: props.input.dispatchId,
					deletedAt: null,
				},
				select: {
					id: true,
					salesOrderId: true,
					status: true,
					deliveryMode: true,
					dueDate: true,
					driverId: true,
					meta: true,
					order: {
						select: {
							orderId: true,
						},
					},
				},
			});
			if (!dispatch) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Dispatch not found.",
				});
			}
			if (
				dispatch.status !== "completed" &&
				props.input.expectedManifestRevision
			) {
				const currentManifestRevision = await getDispatchPackingCommandRevision(
					props.ctx.db,
					dispatch.id,
				);
				if (currentManifestRevision !== props.input.expectedManifestRevision) {
					throw new TRPCError({
						code: "CONFLICT",
						message:
							"This dispatch changed after the proof draft was created. Refresh and review before completing.",
					});
				}
			}
			await enforceSpecialOrderForSale(
				props.ctx,
				dispatch.salesOrderId,
				"DISPATCH",
				"api.dispatch.complete-with-proof",
			);
			if (dispatch.deliveryMode === "pickup") {
				await enforceSpecialOrderForSale(
					props.ctx,
					dispatch.salesOrderId,
					"PACKING",
					"api.dispatch.complete-pickup-packing",
				);
			}

			const payloadFingerprint = getDispatchCompletionPayloadFingerprint(
				props.input,
			);
			const assertProofFingerprint = (
				candidate: DispatchCompletionProof | null,
			) => {
				if (
					candidate?.requestId === props.input.requestId &&
					candidate.payloadFingerprint &&
					candidate.payloadFingerprint !== payloadFingerprint
				) {
					throw new TRPCError({
						code: "CONFLICT",
						message:
							"Completion request id was already used for different proof content.",
					});
				}
			};
			const existingCompletion = getDispatchCompletionProof(dispatch.meta);
			assertProofFingerprint(existingCompletion);
			if (dispatch.status === "completed") {
				if (existingCompletion?.requestId !== props.input.requestId) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "This dispatch was already completed.",
					});
				}
				return {
					status: "completed" as const,
					idempotent: true,
					signature: existingCompletion.signaturePathname,
					signatureDocumentId: existingCompletion.signatureDocumentId,
					attachments: existingCompletion.attachments.map((attachment) => ({
						pathname: attachment.pathname,
						documentId: attachment.documentId,
					})),
				};
			}

			let completion = createDispatchCompletionProof(
				dispatch.meta,
				props.input.requestId,
				new Date(),
				payloadFingerprint,
			);
			let ownsStagedRequest =
				existingCompletion?.requestId === props.input.requestId;
			const persistCompletion = async () => {
				await props.ctx.db.$transaction(
					async (tx) => {
						const current = await tx.orderDelivery.findFirst({
							where: {
								id: dispatch.id,
								deletedAt: null,
							},
							select: {
								status: true,
								meta: true,
							},
						});
						if (!current) {
							throw new TRPCError({
								code: "NOT_FOUND",
								message: "Dispatch not found.",
							});
						}

						const currentCompletion = getDispatchCompletionProof(current.meta);
						assertProofFingerprint(currentCompletion);
						if (current.status === "completed") {
							if (currentCompletion?.requestId !== props.input.requestId) {
								throw new TRPCError({
									code: "CONFLICT",
									message: "This dispatch was already completed.",
								});
							}
							completion = currentCompletion;
							ownsStagedRequest = true;
							return;
						}

						if (
							ownsStagedRequest &&
							currentCompletion?.requestId !== props.input.requestId
						) {
							throw new TRPCError({
								code: "CONFLICT",
								message:
									"Another completion request replaced this proof upload.",
							});
						}
						if (
							!ownsStagedRequest &&
							currentCompletion?.requestId === props.input.requestId
						) {
							completion = currentCompletion;
							ownsStagedRequest = true;
							return;
						}
						if (
							!ownsStagedRequest &&
							currentCompletion?.status === "uploading" &&
							currentCompletion.requestId !== props.input.requestId &&
							!isDispatchCompletionProofStale(currentCompletion)
						) {
							throw new TRPCError({
								code: "CONFLICT",
								message:
									"Another dispatch completion upload is already in progress.",
							});
						}
						if (
							!ownsStagedRequest &&
							currentCompletion?.status === "uploading" &&
							currentCompletion.requestId !== props.input.requestId &&
							isDispatchCompletionProofStale(currentCompletion)
						) {
							const abandonedDocumentIds = [
								currentCompletion.signatureDocumentId,
								...currentCompletion.attachments.map(
									(attachment) => attachment.documentId,
								),
							].filter((id): id is string => Boolean(id));
							if (abandonedDocumentIds.length) {
								await tx.storedDocument.updateMany({
									where: {
										id: { in: abandonedDocumentIds },
										ownerType: "dispatch",
										ownerId: String(dispatch.id),
										deletedAt: null,
									},
									data: {
										status: "failed",
										isCurrent: false,
									},
								});
							}
						}

						await tx.orderDelivery.update({
							where: {
								id: dispatch.id,
							},
							data: {
								meta: mergeDispatchCompletionProof(current.meta, completion),
							},
						});
						ownsStagedRequest = true;
					},
					{ isolationLevel: "Serializable" },
				);
			};
			const checkpointRegisteredProof = async (
				tx: TransactionClient,
				nextCompletion: DispatchCompletionProof,
				registeredDocumentId: string,
			) => {
				const current = await tx.orderDelivery.findFirst({
					where: { id: dispatch.id, deletedAt: null },
					select: { status: true, meta: true },
				});
				const currentCompletion = getDispatchCompletionProof(current?.meta);
				if (currentCompletion?.requestId !== props.input.requestId) {
					throw new Error("Dispatch proof ownership changed.");
				}
				assertProofFingerprint(currentCompletion);
				const alreadyCheckpointed =
					currentCompletion.signatureDocumentId === registeredDocumentId ||
					currentCompletion.attachments.some(
						(attachment) => attachment.documentId === registeredDocumentId,
					);
				if (alreadyCheckpointed) return;
				if (current?.status === "completed") {
					throw new Error(
						"Dispatch completed before this proof document was checkpointed.",
					);
				}
				await tx.orderDelivery.update({
					where: { id: dispatch.id },
					data: {
						meta: mergeDispatchCompletionProof(current?.meta, nextCompletion),
					},
				});
			};
			await persistCompletion();

			const documents = createApiVercelBlobDocumentService({
				put,
				addRandomSuffix: false,
				allowOverwrite: true,
			});
			const proofFolder = `dispatch/${dispatch.id}/completion`;
			if (!completion.signaturePathname) {
				const signature = await documents.upload({
					filename: getDispatchProofFilename(
						props.input.requestId,
						"signature",
					),
					folder: proofFolder,
					contentType: "image/svg+xml",
					body: buildDispatchSignatureSvg(props.input.signaturePath),
				});
				let storedSignature: Awaited<
					ReturnType<typeof registerStoredDocumentUpload>
				>;
				try {
					storedSignature = await finalizeUploadedDocument({
						pathname: signature.pathname,
						deleteUpload: del,
						register: () =>
							registerStoredDocumentUpload(
								props.ctx.db,
								{
									ownerType: "dispatch",
									ownerId: String(dispatch.id),
									ownerKey: `completion:${props.input.requestId}:signature`,
									kind: "signature",
									upload: signature,
									isCurrent: false,
									uploadedBy: props.ctx.userId,
									sourceType: "dispatch_completion_request",
									sourceId: props.input.requestId,
									meta: {
										workflow: "dispatch_completion",
									},
								},
								{
									onRegistered: (tx, document) =>
										checkpointRegisteredProof(
											tx,
											{
												...completion,
												signaturePathname: signature.url || signature.pathname,
												signatureDocumentId: document.id,
											},
											document.id,
										),
								},
							),
						finalize: async (document) => document,
						markFailed: (document) =>
							props.ctx.db.storedDocument.update({
								where: { id: document.id },
								data: {
									status: "failed",
									isCurrent: false,
									deletedAt: new Date(),
								},
							}),
					});
				} catch (error) {
					await props.ctx.db.storedDocument.updateMany({
						where: {
							provider: signature.provider,
							pathname: signature.pathname,
							ownerType: "dispatch",
							ownerId: String(dispatch.id),
							sourceType: "dispatch_completion_request",
							sourceId: props.input.requestId,
							isCurrent: false,
							deletedAt: null,
						},
						data: {
							status: "failed",
							deletedAt: new Date(),
						},
					});
					throw error;
				}
				completion = {
					...completion,
					signaturePathname: signature.url || signature.pathname,
					signatureDocumentId: storedSignature.id,
				};
			}

			for (const attachment of props.input.attachments) {
				if (
					completion.attachments.some(
						(uploaded) => uploaded.clientId === attachment.clientId,
					)
				) {
					continue;
				}
				const uploaded = await documents.upload({
					filename: getDispatchProofFilename(
						props.input.requestId,
						"attachment",
						attachment.clientId,
					),
					folder: proofFolder,
					contentType: attachment.contentType,
					body: decodeValidatedDocumentBase64({
						content: attachment.base64,
						contentType: attachment.contentType,
						maxBytes: 5_500_000,
					}),
				});
				let storedAttachment: Awaited<
					ReturnType<typeof registerStoredDocumentUpload>
				>;
				try {
					storedAttachment = await finalizeUploadedDocument({
						pathname: uploaded.pathname,
						deleteUpload: del,
						register: () =>
							registerStoredDocumentUpload(
								props.ctx.db,
								{
									ownerType: "dispatch",
									ownerId: String(dispatch.id),
									ownerKey: `completion:${props.input.requestId}:${attachment.clientId}`,
									kind: "dispatch_image",
									upload: uploaded,
									isCurrent: false,
									uploadedBy: props.ctx.userId,
									sourceType: "dispatch_completion_request",
									sourceId: props.input.requestId,
									title: attachment.fileName,
									meta: {
										workflow: "dispatch_completion",
										clientId: attachment.clientId,
									},
								},
								{
									onRegistered: (tx, document) =>
										checkpointRegisteredProof(
											tx,
											{
												...completion,
												attachments: [
													...completion.attachments,
													{
														clientId: attachment.clientId,
														pathname: uploaded.url || uploaded.pathname,
														documentId: document.id,
													},
												],
											},
											document.id,
										),
								},
							),
						finalize: async (document) => document,
						markFailed: (document) =>
							props.ctx.db.storedDocument.update({
								where: { id: document.id },
								data: {
									status: "failed",
									isCurrent: false,
									deletedAt: new Date(),
								},
							}),
					});
				} catch (error) {
					await props.ctx.db.storedDocument.updateMany({
						where: {
							provider: uploaded.provider,
							pathname: uploaded.pathname,
							ownerType: "dispatch",
							ownerId: String(dispatch.id),
							sourceType: "dispatch_completion_request",
							sourceId: props.input.requestId,
							isCurrent: false,
							deletedAt: null,
						},
						data: {
							status: "failed",
							deletedAt: new Date(),
						},
					});
					throw error;
				}
				completion = {
					...completion,
					attachments: [
						...completion.attachments,
						{
							clientId: attachment.clientId,
							pathname: uploaded.url || uploaded.pathname,
							documentId: storedAttachment.id,
						},
					],
				};
			}

			const meta = {
				salesId: dispatch.salesOrderId,
				authorId: props.ctx.userId,
				authorName: session.name || "Dispatch worker",
			};
			if (dispatch.deliveryMode === "pickup") {
				await packDispatchItemTask(props.ctx.db, {
					meta,
					packItems: {
						dispatchId: dispatch.id,
						dispatchStatus: (dispatch.status as SalesDispatchStatus) || "queue",
						packMode: "all",
						replaceExisting: true,
					},
				} as UpdateSalesControl);
			}

			const response = await submitDispatchTask(
				props.ctx.db,
				{
					meta,
					submitDispatch: {
						dispatchId: dispatch.id,
						receivedBy: props.input.receivedBy,
						receivedDate: new Date(),
						note: props.input.note,
						noteType:
							dispatch.deliveryMode === "pickup" ? "pickup" : "dispatch",
						signature: completion.signaturePathname,
						attachments: completion.attachments.map((attachment) => ({
							pathname: attachment.pathname,
						})),
						completionRequestId: props.input.requestId,
					},
				} as UpdateSalesControl,
				{
					completeInventoryDispatch: (tx, input) =>
						consumeDispatchBoundInventory(tx, input),
				},
			);

			let notificationQueued = response.idempotent;
			if (!response.idempotent) {
				try {
					await getDispatchNotificationService(props.ctx).send(
						"sales_dispatch_completed",
						{
							payload: {
								salesId: dispatch.salesOrderId,
								orderNo: dispatch.order?.orderId || undefined,
								dispatchId: dispatch.id,
								deliveryMode:
									normalizeDispatchDeliveryMode(dispatch.deliveryMode) ||
									undefined,
								dueDate: dispatch.dueDate || undefined,
								driverId: dispatch.driverId || undefined,
								packedBy: session.name || undefined,
								receivedBy: props.input.receivedBy || undefined,
								signature: completion.signaturePathname,
								attachments: completion.attachments.map(
									(attachment) => attachment.pathname,
								),
							},
						},
					);
					notificationQueued = true;
				} catch {
					notificationQueued = false;
				}
			}

			return {
				status: "completed" as const,
				idempotent: response.idempotent,
				notificationQueued,
				signature: completion.signaturePathname,
				signatureDocumentId: completion.signatureDocumentId,
				attachments: completion.attachments.map((attachment) => ({
					pathname: attachment.pathname,
					documentId: attachment.documentId,
				})),
			};
		}),
	updateSalesDeliveryOption: protectedProcedure
		.input(updateSalesDeliveryOptionSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return updateSalesDeliveryOption(props.ctx, props.input);
		}),
	updateDispatchDriver: protectedProcedure
		.input(updateDispatchDriverSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return updateDispatchDriver(props.ctx, props.input);
		}),
	updateDispatchDueDate: protectedProcedure
		.input(updateDispatchDueDateSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return updateDispatchDueDate(props.ctx, props.input);
		}),
	updateDispatchStatus: protectedProcedure
		.input(updateDispatchStatusSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			await enforceSpecialOrderForDispatch(
				props.ctx,
				props.input.dispatchId,
				"DISPATCH",
				"api.dispatch.update-status",
				props.input.newStatus,
			);
			return updateDispatchStatus(props.ctx, props.input);
		}),
	salesDeliveryInfo: protectedProcedure
		.input(
			z.object({
				salesId: z.number().nullable().optional(),
			}),
		)
		.query(async (props) => {
			await requireDispatchManager(props.ctx);
			return getSalesDeliveryInfo(props.ctx, props.input.salesId);
		}),
	ensureSalesOrderFulfillmentDispatch: protectedProcedure
		.input(z.object({ salesId: z.number().int().positive() }))
		.mutation(async (props) => {
			await requireAnyOperationalPermission(
				props.ctx,
				["markSalesOrderFulfilled"],
				"You do not have permission to mark sales orders fulfilled.",
			);
			await enforceSpecialOrderForSale(
				props.ctx,
				props.input.salesId,
				"DISPATCH",
				"api.dispatch.ensure-sales-order-fulfillment",
			);

			const resolved = await props.ctx.db.$transaction(
				async (tx) => {
					const sale = await tx.salesOrders.findFirstOrThrow({
						where: {
							id: props.input.salesId,
							type: "order",
						},
						select: {
							orderId: true,
							deliveryOption: true,
							deliveries: {
								where: { deletedAt: null },
								orderBy: [{ dueDate: "desc" }, { id: "desc" }],
								select: {
									id: true,
									status: true,
								},
							},
						},
					});
					const existing = sale.deliveries.find((dispatch) => {
						const status = String(dispatch.status || "").toLowerCase();
						return !["completed", "cancelled", "delivered"].includes(status);
					});
					if (existing) {
						return { created: false, dispatchId: existing.id };
					}

					const dueDate = new Date();
					const deliveryMode = (sale.deliveryOption ||
						"delivery") as DeliveryOption;
					const dispatch = await tx.orderDelivery.create({
						data: {
							deliveryMode,
							createdBy: { connect: { id: props.ctx.userId } },
							status: "queue" as SalesDispatchStatus,
							dueDate,
							meta: {},
							order: { connect: { id: props.input.salesId } },
						},
						select: { id: true },
					});
					return {
						created: true,
						deliveryMode,
						dispatchId: dispatch.id,
						dueDate,
						orderNo: sale.orderId,
					};
				},
				{ isolationLevel: "Serializable" },
			);

			if (resolved.created) {
				await getDispatchNotificationService(props.ctx).send(
					"sales_dispatch_created",
					{
						payload: {
							orderNo: resolved.orderNo,
							dispatchId: resolved.dispatchId,
							deliveryMode: resolved.deliveryMode,
							dueDate: resolved.dueDate,
						},
					},
				);
			}

			return { id: resolved.dispatchId };
		}),
	orderDispatchOverview: protectedProcedure
		.input(salesDispatchOverviewSchema)
		.query(async (props) => {
			if (props.input.dispatchId) {
				await requireAssignedDispatchOrManager(
					props.ctx,
					props.input.dispatchId,
					{ allowPackingOperator: true },
				);
			} else {
				await requireDispatchManager(props.ctx);
			}
			return getSalesDispatchOverview(props.ctx.db, {
				salesId: props.input.salesId,
				salesNo: props.input.salesNo,
			});
		}),
	dispatchOverview: protectedProcedure
		.input(salesDispatchOverviewSchema)
		.query(async (props) => {
			await requireAssignedDispatchOrManager(
				props.ctx,
				props.input.dispatchId,
				{ allowPackingOperator: true },
			);
			return getDispatchOverview(props.ctx, props.input);
		}),
	dispatchOverviewV2: protectedProcedure
		.input(salesDispatchOverviewSchema)
		.query(async (props) => {
			await requireAssignedDispatchOrManager(
				props.ctx,
				props.input.dispatchId,
				{ allowPackingOperator: true },
			);
			return getDispatchOverviewV2(props.ctx, props.input);
		}),
	manifest: protectedProcedure
		.input(salesDispatchOverviewSchema)
		.query(async (props) => {
			if (!props.input.dispatchId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Dispatch id is required.",
				});
			}
			const session = await requireAssignedDispatchOrManager(
				props.ctx,
				props.input.dispatchId,
				{ allowPackingOperator: true },
			);
			return getMobileDispatchProjection(
				props.ctx,
				props.input.dispatchId,
				session,
			);
		}),
	prepareInventoryForDispatch: protectedProcedure
		.input(
			z
				.object({
					salesOrderId: z.number().int().positive(),
					orderDeliveryId: z.number().int().positive(),
					items: z
						.array(
							z
								.object({
									salesItemId: z.number().int().positive(),
									qty: z.number().int().nonnegative().optional(),
									lhQty: z.number().int().nonnegative().optional(),
									rhQty: z.number().int().nonnegative().optional(),
								})
								.strict(),
						)
						.max(250)
						.optional(),
				})
				.strict(),
		)
		.mutation(async (props) => {
			await requirePackingOperator(props.ctx);
			await enforceSpecialOrderForSale(
				props.ctx,
				props.input.salesOrderId,
				"PACKING",
				"api.dispatch.prepare-inventory",
			);
			try {
				return await prepareAndPickDispatchInventory(props.ctx.db, props.input);
			} catch (error) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						error instanceof Error
							? error.message
							: "Inventory could not be prepared for this dispatch.",
					cause: error,
				});
			}
		}),
	inventoryReconciliation: protectedProcedure
		.input(
			z.object({
				orderDeliveryId: z.number().int().positive().optional(),
				salesOrderId: z.number().int().positive().optional(),
				limit: z.number().int().min(1).max(2_000).default(500),
			}),
		)
		.query(async (props) => {
			await requireDispatchManager(props.ctx);
			return getDispatchInventoryReconciliation(props.ctx.db, props.input);
		}),
	backfillInventoryBindings: protectedProcedure
		.input(
			z.object({
				dryRun: z.boolean().default(true),
				limit: z.number().int().min(1).max(2_000).default(500),
			}),
		)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return backfillDispatchInventoryBindings(props.ctx.db, props.input);
		}),
	packingQueue: protectedProcedure.query(async (props) => {
		await requirePackingOperator(props.ctx);
		return getPackingQueue(props.ctx);
	}),
	packingList: protectedProcedure
		.input(packingListQuerySchema)
		.query(async (props) => {
			await requirePackingOperator(props.ctx);
			return getPackingList(props.ctx, props.input);
		}),
	packingListSummary: protectedProcedure.query(async (props) => {
		await requirePackingOperator(props.ctx);
		return getPackingListSummary(props.ctx);
	}),
	sendSaleForPickup: protectedProcedure
		.input(sendSaleForPickupSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			await enforceSpecialOrderForSale(
				props.ctx,
				props.input.salesId,
				"DISPATCH",
				"api.dispatch.send-for-pickup",
			);
			return sendSaleForPickup(props.ctx, props.input);
		}),
	signPackingSlip: protectedProcedure
		.input(signPackingSlipSchema)
		.mutation(async (props) => {
			await requireAssignedDispatchOrManager(
				props.ctx,
				props.input.dispatchId,
				{ allowPackingOperator: true },
			);
			await enforceSpecialOrderForDispatch(
				props.ctx,
				props.input.dispatchId,
				"PACKING",
				"api.dispatch.sign-packing-slip",
			);
			const packingRequestId = crypto.randomUUID();
			const owner = {
				ownerType: "dispatch" as const,
				ownerId: String(props.input.dispatchId),
				ownerKey: "packing-slip",
				kind: "signature" as const,
			};
			const dispatch = await props.ctx.db.$transaction(
				async (tx) => {
					const current = await tx.orderDelivery.findFirst({
						where: {
							id: props.input.dispatchId,
							deletedAt: null,
						},
						select: {
							id: true,
							status: true,
							meta: true,
							deliveredAt: true,
							salesOrderId: true,
						},
					});
					if (!current) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Packing delivery not found.",
						});
					}
					const meta = asJsonRecord(current.meta);
					const signoff = asJsonRecord(meta.packingSignoff);
					const startedAt =
						typeof signoff.startedAt === "string"
							? new Date(signoff.startedAt).getTime()
							: Number.NaN;
					const activeLease =
						(signoff.status === "processing" ||
							signoff.status === "uploaded") &&
						Number.isFinite(startedAt) &&
						Date.now() - startedAt < PACKING_SIGNOFF_LEASE_MS;
					if (activeLease) {
						throw new TRPCError({
							code: "CONFLICT",
							message: "Another packing sign-off is already in progress.",
						});
					}
					const existingDocumentId =
						typeof signoff.documentId === "string" ? signoff.documentId : null;
					if (
						signoff.status === "uploaded" &&
						existingDocumentId &&
						!activeLease
					) {
						await tx.storedDocument.updateMany({
							where: {
								id: existingDocumentId,
								ownerType: owner.ownerType,
								ownerId: owner.ownerId,
								kind: owner.kind,
								isCurrent: false,
								deletedAt: null,
							},
							data: {
								status: "failed",
								isCurrent: false,
								deletedAt: new Date(),
							},
						});
					}
					if (
						current.status === "completed" &&
						signoff.status === "domain_completed" &&
						existingDocumentId
					) {
						const promoted = await tx.storedDocument.updateMany({
							where: {
								id: existingDocumentId,
								ownerType: owner.ownerType,
								ownerId: owner.ownerId,
								status: "ready",
								deletedAt: null,
							},
							data: { isCurrent: true },
						});
						if (!promoted.count) {
							throw new TRPCError({
								code: "CONFLICT",
								message:
									"The completed packing signature could not be reconciled.",
							});
						}
						await tx.storedDocument.updateMany({
							where: {
								ownerType: owner.ownerType,
								ownerId: owner.ownerId,
								kind: owner.kind,
								isCurrent: true,
								deletedAt: null,
								id: { not: existingDocumentId },
							},
							data: { isCurrent: false },
						});
						meta.packingSignoff = {
							...signoff,
							status: "completed",
							completedAt: new Date().toISOString(),
						};
						await tx.orderDelivery.update({
							where: { id: current.id },
							data: {
								meta: JSON.parse(JSON.stringify(meta)),
							},
						});
						return {
							id: current.id,
							salesOrderId: current.salesOrderId,
							resignExpired: false,
							reconciled: true,
						};
					}
					const canResign = canResignPackingSlip(current);
					if (current.status === "completed" && !canResign) {
						return {
							id: current.id,
							salesOrderId: current.salesOrderId,
							resignExpired: true,
							reconciled: false,
						};
					}
					await tx.orderDelivery.update({
						where: { id: current.id },
						data: {
							meta: JSON.parse(
								JSON.stringify({
									...meta,
									packingSignoff: {
										requestId: packingRequestId,
										status: "processing",
										startedAt: new Date().toISOString(),
									},
								}),
							),
						},
					});
					return {
						id: current.id,
						salesOrderId: current.salesOrderId,
						resignExpired: false,
						reconciled: false,
					};
				},
				{ isolationLevel: "Serializable" },
			);
			if (dispatch.resignExpired) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "The five-minute packing re-sign window has expired.",
				});
			}
			if (dispatch.reconciled) {
				return {
					ok: true,
					dispatchId: dispatch.id,
					salesId: dispatch.salesOrderId,
					reconciled: true,
				};
			}
			const failPackingLease = async () => {
				await props.ctx.db.$transaction(async (tx) => {
					const current = await tx.orderDelivery.findFirst({
						where: { id: dispatch.id, deletedAt: null },
						select: { meta: true },
					});
					const meta = asJsonRecord(current?.meta);
					const signoff = asJsonRecord(meta.packingSignoff);
					if (signoff.requestId !== packingRequestId) return;
					await tx.orderDelivery.update({
						where: { id: dispatch.id },
						data: {
							meta: JSON.parse(
								JSON.stringify({
									...meta,
									packingSignoff: {
										...signoff,
										status: "failed",
										failedAt: new Date().toISOString(),
									},
								}),
							),
						},
					});
				});
			};
			const documents = createApiVercelBlobDocumentService({ put });
			let storedDocument: Awaited<
				ReturnType<typeof registerStoredDocumentUpload>
			>;
			try {
				const uploaded = await documents.upload({
					filename: `packing-slip-${Date.now()}.png`,
					folder: buildOwnerDocumentFolder(owner),
					contentType: "image/png",
					body: decodePngSignatureDataUrl(props.input.signature),
				});
				storedDocument = await finalizeUploadedDocument({
					pathname: uploaded.pathname,
					deleteUpload: del,
					register: () =>
						registerStoredDocumentUpload(
							props.ctx.db,
							{
								...owner,
								upload: uploaded,
								isCurrent: false,
								uploadedBy: props.ctx.userId,
								sourceType: "packing_slip_signoff",
								sourceId: String(props.input.dispatchId),
								meta: {
									workflow: "packing_slip",
									receivedBy: props.input.receivedBy?.trim() || null,
								},
							},
							{
								onRegistered: async (tx, document) => {
									const current = await tx.orderDelivery.findFirst({
										where: { id: dispatch.id, deletedAt: null },
										select: { meta: true },
									});
									const meta = asJsonRecord(current?.meta);
									const signoff = asJsonRecord(meta.packingSignoff);
									if (signoff.requestId !== packingRequestId) {
										throw new Error("Packing sign-off ownership changed.");
									}
									await tx.orderDelivery.update({
										where: { id: dispatch.id },
										data: {
											meta: JSON.parse(
												JSON.stringify({
													...meta,
													packingSignoff: {
														...signoff,
														status: "uploaded",
														documentId: document.id,
														uploadedAt: new Date().toISOString(),
													},
												}),
											),
										},
									});
								},
							},
						),
					finalize: async (document) => document,
					markFailed: (document) =>
						props.ctx.db.storedDocument.update({
							where: { id: document.id },
							data: {
								status: "failed",
								isCurrent: false,
								deletedAt: new Date(),
							},
						}),
				});
			} catch (error) {
				await Promise.allSettled([failPackingLease()]);
				throw error;
			}
			const signature = storedDocument.url || storedDocument.pathname;

			let result: Awaited<ReturnType<typeof signPackingSlip>>;
			try {
				result = await signPackingSlip(props.ctx, {
					...props.input,
					signature,
					packingRequestId,
					signatureDocumentId: storedDocument.id,
				});
			} catch (error) {
				await Promise.allSettled([
					props.ctx.db.storedDocument.updateMany({
						where: {
							id: storedDocument.id,
							ownerType: owner.ownerType,
							ownerId: owner.ownerId,
						},
						data: {
							isCurrent: false,
							status: "failed",
						},
					}),
					failPackingLease(),
				]);
				throw error;
			}

			try {
				await props.ctx.db.$transaction(async (tx) => {
					const current = await tx.orderDelivery.findFirst({
						where: { id: dispatch.id, deletedAt: null },
						select: { meta: true },
					});
					const meta = asJsonRecord(current?.meta);
					const signoff = asJsonRecord(meta.packingSignoff);
					if (signoff.requestId !== packingRequestId) {
						throw new Error("Packing sign-off ownership changed.");
					}
					await tx.storedDocument.updateMany({
						where: {
							ownerType: owner.ownerType,
							ownerId: owner.ownerId,
							kind: owner.kind,
							isCurrent: true,
							deletedAt: null,
							id: { not: storedDocument.id },
						},
						data: { isCurrent: false },
					});
					await tx.storedDocument.update({
						where: { id: storedDocument.id },
						data: { isCurrent: true, status: "ready" },
					});
					await tx.orderDelivery.update({
						where: { id: dispatch.id },
						data: {
							meta: JSON.parse(
								JSON.stringify({
									...meta,
									packingSignoff: {
										...signoff,
										status: "completed",
										completedAt: new Date().toISOString(),
										documentId: storedDocument.id,
									},
								}),
							),
						},
					});
				});
			} catch (error) {
				console.error(
					"Packing completed, but signature current-document promotion failed.",
					error,
				);
			}
			return result;
		}),
	findDuplicateGroups: protectedProcedure.query(async (props) => {
		await requireDispatchManager(props.ctx);
		return findDuplicateDispatchGroups(props.ctx);
	}),
	resolveDuplicateGroup: protectedProcedure
		.input(resolveDuplicateDispatchGroupSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return resolveDuplicateDispatchGroup(props.ctx, props.input);
		}),
	prepareNonProduceablePacking: protectedProcedure
		.input(
			z.object({
				salesId: z.number(),
			}),
		)
		.mutation(async (props) => {
			await requirePackingOperator(props.ctx);
			await enforceSpecialOrderForSale(
				props.ctx,
				props.input.salesId,
				"PRODUCTION",
				"api.dispatch.prepare-non-produceable",
			);
			const authorId = Number(props.ctx.userId || 0);
			const submitPayload: UpdateSalesControl = {
				meta: {
					salesId: props.input.salesId,
					authorId: Number.isFinite(authorId) && authorId > 0 ? authorId : 1,
					authorName: "System",
				},
			};
			await submitNonProductionsTask(props.ctx.db as Db, submitPayload);
			return { ok: true };
		}),
	createDispatch: protectedProcedure
		.input(createDispatchSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			let {
				salesId,
				deliveryMode: _deliverMode,
				dueDate,
				driverId,
				status,
			} = props.input;
			await enforceSpecialOrderForSale(
				props.ctx,
				salesId,
				"DISPATCH",
				"api.dispatch.create",
			);
			const deliveryMode = (_deliverMode || "delivery") as DeliveryOption;
			if (driverId) driverId = Number(driverId);
			const dispatch = await props.ctx.db.orderDelivery.create({
				data: {
					deliveryMode,
					createdBy: {
						connect: {
							id: props.ctx.userId,
						},
					},
					driver: driverId
						? {
								connect: {
									id: driverId,
								},
							}
						: undefined,
					status: status || ("queue" as SalesDispatchStatus),
					dueDate,
					meta: {},
					order: {
						connect: { id: salesId },
					},
				},
				include: {
					order: {
						select: {
							orderId: true,
						},
					},
				},
			});
			// try {
			//   const authorId = Number(props.ctx.userId || 0);
			//   await submitNonProductionsTask(
			//     props.ctx.db as any,
			//     {
			//       meta: {
			//         salesId,
			//         authorId:
			//           Number.isFinite(authorId) && authorId > 0 ? authorId : 1,
			//         authorName: "System",
			//       },
			//     } as any,
			//   );
			// } catch {
			//   // Do not block dispatch creation if pre-pack preparation fails.
			// }
			await getDispatchNotificationService(props.ctx).send(
				"sales_dispatch_created",
				{
					payload: {
						orderNo: dispatch.order?.orderId,
						dispatchId: dispatch.id,
						deliveryMode,
						dueDate: dispatch.dueDate || undefined,
						driverId: dispatch.driverId || undefined,
					},
				},
			);
			if (dispatch.driverId) {
				await getDispatchNotificationService(props.ctx)
					.setEmployeeRecipients(dispatch.driverId)
					.send("sales_dispatch_assigned", {
						payload: {
							orderNo: dispatch.order?.orderId,
							dispatchId: dispatch.id,
							deliveryMode,
							dueDate: dispatch.dueDate || undefined,
							driverId: dispatch.driverId,
						},
					});
			}
			// await tasks.
			return dispatch;
		}),
	deleteDispatch: protectedProcedure
		.input(
			z.object({
				dispatchId: z.number(),
			}),
		)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			await deleteDispatch(props.ctx, props.input.dispatchId);
			// return deletePackingItem(props.ctx.db, props.input);
		}),
	debugLog: protectedProcedure
		.input(
			z.object({
				entry: z.any(),
			}),
		)
		.mutation(async (props) => {
			await requireDispatchWorker(props.ctx);
			const isDev = process.env.NODE_ENV === "development";
			const enabled =
				String(process.env.EXPO_PUBLIC_DEBUG_LOGGER ?? "1").toLowerCase() !==
				"false";
			if (!isDev || !enabled) {
				return { ok: true, skipped: true };
			}
			const { appendDevLogEntryToFile } = await import(
				"@gnd/dev-logger/file-sink"
			);
			await appendDevLogEntryToFile(props.input.entry as DevLogEntry);
			return { ok: true, skipped: false };
		}),
	dispatchSummary: protectedProcedure.query(async (props) => {
		await requireDispatchManager(props.ctx);
		return getDispatchSummary(props.ctx);
	}),
	bulkAssignDriver: protectedProcedure
		.input(bulkAssignDriverSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return bulkAssignDispatchDriver(props.ctx, props.input);
		}),
	bulkCancel: protectedProcedure
		.input(bulkCancelDispatchSchema)
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return bulkCancelDispatches(props.ctx, props.input);
		}),
	exportDispatches: protectedProcedure
		.input(exportDispatchesSchema)
		.query(async (props) => {
			await requireDispatchManager(props.ctx);
			return exportDispatches(props.ctx, props.input);
		}),
	getDeleted: protectedProcedure.query(async (props) => {
		await requireDispatchManager(props.ctx);
		return getDeletedDispatches(props.ctx);
	}),
	restore: protectedProcedure
		.input(z.object({ dispatchId: z.number() }))
		.mutation(async (props) => {
			await requireDispatchManager(props.ctx);
			return restoreDispatch(props.ctx, props.input.dispatchId);
		}),
});
