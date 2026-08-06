import { createHash } from "node:crypto";
import type { Database, Prisma, TransactionClient } from "@gnd/db";
import { z } from "zod";
import { syncInventoryProductionLifecycleForSale } from "./inventory-production-lifecycle";
import {
	type SalesOrderLifecycleStatus,
	getSalesOrderLifecycleStatusInfo,
} from "./order-status";
import { resetSalesAction } from "./sales-control/actions";
import { withSalesControl } from "./utils/with-sales-control";

export const salesWorkflowCancellationActionSchema = z.enum([
	"production",
	"fulfillment",
]);

export type SalesWorkflowCancellationAction = z.infer<
	typeof salesWorkflowCancellationActionSchema
>;

export const salesWorkflowCancellationPreviewSchema = z.object({
	salesOrderId: z.number().int().positive(),
	action: salesWorkflowCancellationActionSchema,
});

export const cancelSalesWorkflowLayerSchema =
	salesWorkflowCancellationPreviewSchema.extend({
		expectedRevision: z.string().length(64),
		requestId: z.string().uuid(),
		reason: z.string().trim().min(3).max(500),
	});

export type SalesWorkflowCancellationBlockerCode =
	| "NO_REVERSIBLE_FULFILLMENT"
	| "FULFILLMENT_IN_TRANSIT"
	| "FULFILLMENT_DELIVERED"
	| "FULFILLMENT_STATUS_UNSUPPORTED"
	| "FULFILLMENT_ALREADY_STARTED"
	| "NO_AUTOMATIC_PRODUCTION"
	| "PRODUCTION_PAYROLL_LOCKED";

export type SalesWorkflowCancellationBlocker = {
	code: SalesWorkflowCancellationBlockerCode;
	message: string;
	resourceType?: "dispatch" | "production_submission" | "payroll";
	resourceId?: number;
};

export type SalesWorkflowCancellationPreview = {
	allowed: boolean;
	action: SalesWorkflowCancellationAction;
	salesOrderId: number;
	orderNo: string;
	revision: string;
	currentLifecycle: SalesOrderLifecycleStatus;
	resultingLifecycle: SalesOrderLifecycleStatus;
	blockers: SalesWorkflowCancellationBlocker[];
	effects: {
		dispatchIds: number[];
		packedItemIds: number[];
		automaticSubmissionIds: number[];
		cancelledMaterialReviewIds: number[];
		preservedMaterialReviewIds: number[];
		deletedPendingPayrollIds: number[];
		paymentReviewIds: number[];
		revokedReadinessOverrideId: number | null;
	};
	preserved: {
		manualSubmissionIds: number[];
		inboundShipmentIds: number[];
		receivedInboundQty: number;
		stockMovementCount: number;
		message: string;
	};
};

export type SalesWorkflowCancellationResult = {
	requestId: string;
	salesOrderId: number;
	action: SalesWorkflowCancellationAction;
	currentLifecycle: SalesOrderLifecycleStatus;
	resultingLifecycle: SalesOrderLifecycleStatus;
	effects: SalesWorkflowCancellationPreview["effects"];
	idempotentReplay: boolean;
};

export class SalesWorkflowCancellationError extends Error {
	constructor(
		message: string,
		readonly code:
			| "NOT_FOUND"
			| "BLOCKED"
			| "STALE_PREVIEW"
			| "IDEMPOTENCY_CONFLICT",
		readonly blockers: SalesWorkflowCancellationBlocker[] = [],
	) {
		super(message);
		this.name = "SalesWorkflowCancellationError";
	}
}

type CancellationDb = Database | TransactionClient;

type CancellationState = NonNullable<
	Awaited<ReturnType<typeof loadCancellationState>>
>;

const REVERSIBLE_FULFILLMENT_STATUSES = new Set([
	"queue",
	"queued",
	"packing",
	"packing queue",
	"missing item",
	"missing items",
	"packed",
]);
const TRANSIT_FULFILLMENT_STATUSES = new Set([
	"in progress",
	"in transit",
	"transit",
	"dispatching",
	"dispatched",
]);
const TERMINAL_FULFILLMENT_STATUSES = new Set([
	"complete",
	"completed",
	"delivered",
	"fulfilled",
]);

function normalizeStatus(value: unknown) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ");
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function isAutomaticSubmission(meta: unknown) {
	return asRecord(meta).source === "sales_mark_as_completed";
}

function hasDeliveryProof(meta: unknown) {
	return Object.keys(asRecord(asRecord(meta).dispatchCompletion)).length > 0;
}

function mergeCancellationMeta(
	meta: unknown,
	input: {
		requestId: string;
		reason: string;
		actorId: number;
		cancelledAt: string;
	},
) {
	return {
		...asRecord(meta),
		workflowCancellation: input,
	} satisfies Prisma.InputJsonObject;
}

function revisionFor(value: unknown) {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function resolveFulfillmentStatus(deliveries: CancellationState["deliveries"]) {
	const active = deliveries.filter(
		(delivery) => normalizeStatus(delivery.status) !== "cancelled",
	);
	if (
		active.some((delivery) =>
			TERMINAL_FULFILLMENT_STATUSES.has(normalizeStatus(delivery.status)),
		)
	)
		return "completed";
	if (
		active.some((delivery) =>
			TRANSIT_FULFILLMENT_STATUSES.has(normalizeStatus(delivery.status)),
		)
	)
		return "in progress";
	if (active.some((delivery) => normalizeStatus(delivery.status) === "packed"))
		return "packed";
	if (
		active.some((delivery) =>
			["packing", "packing queue", "missing item", "missing items"].includes(
				normalizeStatus(delivery.status),
			),
		)
	)
		return "packing";
	if (active.length) return "queue";
	return null;
}

function lifecycle(input: {
	orderStatus: string | null;
	productionStatus: string | null;
	fulfillmentStatus: string | null;
}) {
	return getSalesOrderLifecycleStatusInfo({
		orderStatus: input.orderStatus,
		productionStatus: input.productionStatus,
		fulfillmentStatus: input.fulfillmentStatus,
	}).status;
}

async function loadCancellationState(db: CancellationDb, salesOrderId: number) {
	const order = await db.salesOrders.findFirst({
		where: { id: salesOrderId, type: "order", deletedAt: null },
		select: {
			id: true,
			orderId: true,
			status: true,
			prodStatus: true,
			updatedAt: true,
			deliveries: {
				where: { deletedAt: null },
				orderBy: { id: "asc" },
				select: {
					id: true,
					status: true,
					deliveredAt: true,
					deliveredTo: true,
					meta: true,
					updatedAt: true,
					items: {
						where: { deletedAt: null },
						orderBy: { id: "asc" },
						select: {
							id: true,
							packingStatus: true,
							packedBy: true,
							unpackedBy: true,
							updatedAt: true,
						},
					},
				},
			},
			productions: {
				where: { deletedAt: null },
				orderBy: { id: "asc" },
				select: {
					id: true,
					meta: true,
					materialReviewId: true,
					updatedAt: true,
					payroll: {
						select: {
							id: true,
							status: true,
							payoutId: true,
							deletedAt: true,
							updatedAt: true,
						},
					},
				},
			},
			productionSubmissionMaterialReviews: {
				orderBy: { id: "asc" },
				select: {
					id: true,
					status: true,
					resolution: true,
					updatedAt: true,
					submissions: {
						where: { deletedAt: null },
						select: { id: true, meta: true },
					},
				},
			},
			payments: {
				where: { deletedAt: null },
				orderBy: { id: "asc" },
				select: {
					id: true,
					reviewStatus: true,
					reviewMethod: true,
					reviewedByAction: true,
					reviewedAt: true,
					reviewedById: true,
					reviewNote: true,
					updatedAt: true,
				},
			},
			productionReadinessOverride: {
				select: { id: true, status: true, revision: true, updatedAt: true },
			},
			lineItems: {
				where: { deletedAt: null },
				select: {
					components: {
						select: {
							inboundDemands: {
								where: { deletedAt: null },
								select: {
									id: true,
									qtyReceived: true,
									status: true,
									updatedAt: true,
									inboundShipmentItem: {
										select: {
											inboundId: true,
											stockMovement: {
												where: { deletedAt: null },
												select: { id: true },
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	});
	if (!order) return null;
	const [control] = await withSalesControl([{ id: order.id }], db as Database);
	return {
		...order,
		controlProductionStatus: control?.statistic.productionStatus || null,
	};
}

export function buildSalesWorkflowCancellationPreview(
	state: CancellationState,
	action: SalesWorkflowCancellationAction,
): SalesWorkflowCancellationPreview {
	const blockers: SalesWorkflowCancellationBlocker[] = [];
	const activeDeliveries = state.deliveries.filter(
		(delivery) => normalizeStatus(delivery.status) !== "cancelled",
	);
	const automaticSubmissions = state.productions.filter((submission) =>
		isAutomaticSubmission(submission.meta),
	);
	const manualSubmissions = state.productions.filter(
		(submission) => !isAutomaticSubmission(submission.meta),
	);
	const automaticIds = new Set(automaticSubmissions.map(({ id }) => id));

	const reversibleDeliveries = activeDeliveries.filter((delivery) => {
		const status = normalizeStatus(delivery.status);
		if (
			delivery.deliveredAt ||
			delivery.deliveredTo ||
			hasDeliveryProof(delivery.meta) ||
			TERMINAL_FULFILLMENT_STATUSES.has(status)
		) {
			blockers.push({
				code: "FULFILLMENT_DELIVERED",
				message: `Dispatch ${delivery.id} has delivery or completion evidence. Use a return or delivery-correction workflow.`,
				resourceType: "dispatch",
				resourceId: delivery.id,
			});
			return false;
		}
		if (TRANSIT_FULFILLMENT_STATUSES.has(status)) {
			blockers.push({
				code: "FULFILLMENT_IN_TRANSIT",
				message: `Dispatch ${delivery.id} is in progress or in transit. Return it to the warehouse before cancelling fulfillment.`,
				resourceType: "dispatch",
				resourceId: delivery.id,
			});
			return false;
		}
		if (!REVERSIBLE_FULFILLMENT_STATUSES.has(status)) {
			blockers.push({
				code: "FULFILLMENT_STATUS_UNSUPPORTED",
				message: `Dispatch ${delivery.id} has an unrecognized status and cannot be cancelled safely.`,
				resourceType: "dispatch",
				resourceId: delivery.id,
			});
			return false;
		}
		return true;
	});

	if (action === "fulfillment" && activeDeliveries.length === 0) {
		blockers.push({
			code: "NO_REVERSIBLE_FULFILLMENT",
			message: "No active fulfillment was found for this order.",
		});
	}

	if (action === "production" && activeDeliveries.length > 0) {
		blockers.push({
			code: "FULFILLMENT_ALREADY_STARTED",
			message:
				"Fulfillment has begun. Cancel the reversible fulfillment layer first.",
		});
	}
	if (action === "production" && automaticSubmissions.length === 0) {
		blockers.push({
			code: "NO_AUTOMATIC_PRODUCTION",
			message:
				"No automatic Mark-as production submissions were found. Manual or ambiguous production is preserved.",
		});
	}

	const reversiblePayrollIds: number[] = [];
	if (action === "production") {
		for (const submission of automaticSubmissions) {
			const payroll = submission.payroll;
			if (!payroll || payroll.deletedAt) continue;
			if (payroll.status === "PENDING" && payroll.payoutId === null) {
				reversiblePayrollIds.push(payroll.id);
				continue;
			}
			blockers.push({
				code: "PRODUCTION_PAYROLL_LOCKED",
				message: `Payroll ${payroll.id} is processing, completed, failed, paid, or attached to a payout and must be corrected separately.`,
				resourceType: "payroll",
				resourceId: payroll.id,
			});
		}
	}

	const cancelledMaterialReviewIds: number[] = [];
	const preservedMaterialReviewIds: number[] = [];
	for (const review of state.productionSubmissionMaterialReviews) {
		if (
			!automaticSubmissions.some(
				(submission) => submission.materialReviewId === review.id,
			)
		)
			continue;
		const hasSurvivingSubmission = review.submissions.some(
			(submission) => !automaticIds.has(submission.id),
		);
		if (hasSurvivingSubmission) preservedMaterialReviewIds.push(review.id);
		else if (review.status === "APPROVED")
			cancelledMaterialReviewIds.push(review.id);
	}

	const paymentReviewIds = state.payments
		.filter(
			(payment) =>
				payment.reviewStatus === "reviewed" &&
				payment.reviewMethod === "auto" &&
				payment.reviewedByAction === action &&
				(action === "fulfillment" || manualSubmissions.length === 0),
		)
		.map(({ id }) => id);

	const inboundDemands = state.lineItems.flatMap((lineItem) =>
		lineItem.components.flatMap((component) => component.inboundDemands),
	);
	const inboundShipmentIds = [
		...new Set(
			inboundDemands.flatMap((demand) =>
				demand.inboundShipmentItem
					? [demand.inboundShipmentItem.inboundId]
					: [],
			),
		),
	].sort((left, right) => left - right);
	const stockMovementCount = inboundDemands.reduce(
		(total, demand) =>
			total + (demand.inboundShipmentItem?.stockMovement.length || 0),
		0,
	);
	const receivedInboundQty = inboundDemands.reduce(
		(total, demand) => total + Number(demand.qtyReceived || 0),
		0,
	);

	const currentProductionStatus = automaticSubmissions.length
		? "completed"
		: state.controlProductionStatus || state.prodStatus;
	const currentLifecycle = lifecycle({
		orderStatus: state.status,
		productionStatus: currentProductionStatus,
		fulfillmentStatus: resolveFulfillmentStatus(state.deliveries),
	});
	const resultingLifecycle = lifecycle({
		orderStatus: state.status,
		productionStatus:
			action === "production" && manualSubmissions.length === 0
				? "pending"
				: currentProductionStatus,
		fulfillmentStatus: null,
	});
	const effects = {
		dispatchIds:
			action === "fulfillment" ? reversibleDeliveries.map(({ id }) => id) : [],
		packedItemIds:
			action === "fulfillment"
				? reversibleDeliveries.flatMap((delivery) =>
						delivery.items
							.filter(
								(item) => normalizeStatus(item.packingStatus) === "packed",
							)
							.map(({ id }) => id),
					)
				: [],
		automaticSubmissionIds:
			action === "production" ? automaticSubmissions.map(({ id }) => id) : [],
		cancelledMaterialReviewIds:
			action === "production" ? cancelledMaterialReviewIds : [],
		preservedMaterialReviewIds:
			action === "production" ? preservedMaterialReviewIds : [],
		deletedPendingPayrollIds:
			action === "production" ? reversiblePayrollIds : [],
		paymentReviewIds,
		revokedReadinessOverrideId:
			action === "production" &&
			state.productionReadinessOverride?.status === "ACTIVE"
				? state.productionReadinessOverride.id
				: null,
	};
	const revision = revisionFor({
		order: {
			id: state.id,
			status: state.status,
			prodStatus: state.prodStatus,
			controlProductionStatus: state.controlProductionStatus,
			updatedAt: state.updatedAt,
		},
		deliveries: state.deliveries,
		productions: state.productions,
		reviews: state.productionSubmissionMaterialReviews,
		payments: state.payments,
		override: state.productionReadinessOverride,
		inboundDemands,
	});

	return {
		allowed: blockers.length === 0,
		action,
		salesOrderId: state.id,
		orderNo: state.orderId,
		revision,
		currentLifecycle,
		resultingLifecycle,
		blockers,
		effects,
		preserved: {
			manualSubmissionIds: manualSubmissions.map(({ id }) => id),
			inboundShipmentIds,
			receivedInboundQty,
			stockMovementCount,
			message:
				"Inbound receipts, stock quantities, stock movements, inventory logs, and manual availability evidence will not be reversed.",
		},
	};
}

export async function getSalesWorkflowCancellationPreview(
	db: CancellationDb,
	input: z.infer<typeof salesWorkflowCancellationPreviewSchema>,
) {
	const parsed = salesWorkflowCancellationPreviewSchema.parse(input);
	const state = await loadCancellationState(db, parsed.salesOrderId);
	if (!state) {
		throw new SalesWorkflowCancellationError(
			"Sales order not found.",
			"NOT_FOUND",
		);
	}
	return buildSalesWorkflowCancellationPreview(state, parsed.action);
}

function storedResult(
	value: Prisma.JsonValue,
): SalesWorkflowCancellationResult {
	return value as unknown as SalesWorkflowCancellationResult;
}

export async function cancelSalesWorkflowLayer(
	db: Database,
	input: z.infer<typeof cancelSalesWorkflowLayerSchema>,
	actor: { id: number; name: string },
): Promise<SalesWorkflowCancellationResult> {
	const parsed = cancelSalesWorkflowLayerSchema.parse(input);
	const cancelledAt = new Date();
	return db.$transaction(
		async (tx) => {
			const replay = await tx.salesWorkflowCancellation.findUnique({
				where: { requestId: parsed.requestId },
				select: { salesOrderId: true, action: true, result: true },
			});
			if (replay) {
				if (
					replay.salesOrderId !== parsed.salesOrderId ||
					replay.action !== parsed.action
				) {
					throw new SalesWorkflowCancellationError(
						"This request ID was already used for a different cancellation.",
						"IDEMPOTENCY_CONFLICT",
					);
				}
				return { ...storedResult(replay.result), idempotentReplay: true };
			}

			const preview = await getSalesWorkflowCancellationPreview(tx, parsed);
			if (preview.revision !== parsed.expectedRevision) {
				throw new SalesWorkflowCancellationError(
					"The order changed after this cancellation review. Refresh the preview and try again.",
					"STALE_PREVIEW",
				);
			}
			if (!preview.allowed) {
				throw new SalesWorkflowCancellationError(
					preview.blockers[0]?.message || "Cancellation is blocked.",
					"BLOCKED",
					preview.blockers,
				);
			}

			const cancellationMeta = {
				requestId: parsed.requestId,
				reason: parsed.reason,
				actorId: actor.id,
				cancelledAt: cancelledAt.toISOString(),
			};
			if (parsed.action === "fulfillment") {
				const state = await loadCancellationState(tx, parsed.salesOrderId);
				if (!state)
					throw new SalesWorkflowCancellationError(
						"Sales order not found.",
						"NOT_FOUND",
					);
				for (const delivery of state.deliveries.filter((item) =>
					preview.effects.dispatchIds.includes(item.id),
				)) {
					const updated = await tx.orderDelivery.updateMany({
						where: {
							id: delivery.id,
							salesOrderId: parsed.salesOrderId,
							deletedAt: null,
							deliveredAt: null,
							status: delivery.status,
						},
						data: {
							status: "cancelled",
							meta: mergeCancellationMeta(delivery.meta, cancellationMeta),
						},
					});
					if (updated.count !== 1) {
						throw new SalesWorkflowCancellationError(
							"The dispatch changed during cancellation.",
							"STALE_PREVIEW",
						);
					}
				}
				if (preview.effects.packedItemIds.length) {
					const unpacked = await tx.orderItemDelivery.updateMany({
						where: {
							id: { in: preview.effects.packedItemIds },
							orderId: parsed.salesOrderId,
							deletedAt: null,
							packingStatus: "packed",
						},
						data: { packingStatus: "unpacked", unpackedBy: actor.name },
					});
					if (unpacked.count !== preview.effects.packedItemIds.length) {
						throw new SalesWorkflowCancellationError(
							"Packing rows changed during cancellation.",
							"STALE_PREVIEW",
						);
					}
				}
			} else {
				if (preview.effects.deletedPendingPayrollIds.length) {
					const payroll = await tx.payroll.updateMany({
						where: {
							id: { in: preview.effects.deletedPendingPayrollIds },
							status: "PENDING",
							payoutId: null,
							deletedAt: null,
						},
						data: { deletedAt: cancelledAt },
					});
					if (
						payroll.count !== preview.effects.deletedPendingPayrollIds.length
					) {
						throw new SalesWorkflowCancellationError(
							"Production payroll changed during cancellation.",
							"STALE_PREVIEW",
						);
					}
				}
				const submissions = await tx.orderProductionSubmissions.updateMany({
					where: {
						id: { in: preview.effects.automaticSubmissionIds },
						salesOrderId: parsed.salesOrderId,
						deletedAt: null,
					},
					data: { deletedAt: cancelledAt },
				});
				if (
					submissions.count !== preview.effects.automaticSubmissionIds.length
				) {
					throw new SalesWorkflowCancellationError(
						"Production submissions changed during cancellation.",
						"STALE_PREVIEW",
					);
				}
				for (const reviewId of preview.effects.cancelledMaterialReviewIds) {
					const review =
						await tx.salesProductionSubmissionMaterialReview.findUnique({
							where: { id: reviewId },
							select: { resolution: true },
						});
					const cancelledReview =
						await tx.salesProductionSubmissionMaterialReview.updateMany({
							where: {
								id: reviewId,
								salesOrderId: parsed.salesOrderId,
								status: "APPROVED",
							},
							data: {
								status: "CANCELLED",
								cancelledAt,
								resolution: mergeCancellationMeta(
									review?.resolution,
									cancellationMeta,
								),
							},
						});
					if (cancelledReview.count !== 1) {
						throw new SalesWorkflowCancellationError(
							"The production review changed during cancellation.",
							"STALE_PREVIEW",
						);
					}
				}
				if (preview.effects.revokedReadinessOverrideId) {
					const revokedOverride =
						await tx.salesProductionReadinessOverride.updateMany({
							where: {
								id: preview.effects.revokedReadinessOverrideId,
								salesOrderId: parsed.salesOrderId,
								status: "ACTIVE",
							},
							data: {
								status: "REVOKED",
								revokedAt: cancelledAt,
								revokedByUserId: actor.id,
							},
						});
					if (revokedOverride.count !== 1) {
						throw new SalesWorkflowCancellationError(
							"The production readiness override changed during cancellation.",
							"STALE_PREVIEW",
						);
					}
				}
			}

			if (preview.effects.paymentReviewIds.length) {
				const paymentReviews = await tx.salesPayments.updateMany({
					where: {
						id: { in: preview.effects.paymentReviewIds },
						orderId: parsed.salesOrderId,
						reviewStatus: "reviewed",
						reviewMethod: "auto",
						reviewedByAction: parsed.action,
						deletedAt: null,
					},
					data: {
						reviewStatus: "needs_review",
						reviewedAt: null,
						reviewedById: null,
						reviewMethod: null,
						reviewedByAction: null,
						reviewNote: null,
					},
				});
				if (paymentReviews.count !== preview.effects.paymentReviewIds.length) {
					throw new SalesWorkflowCancellationError(
						"Payment review state changed during cancellation.",
						"STALE_PREVIEW",
					);
				}
			}

			await resetSalesAction(tx as never, parsed.salesOrderId);
			if (parsed.action === "production") {
				await syncInventoryProductionLifecycleForSale(
					tx as never,
					parsed.salesOrderId,
				);
			}

			const result: SalesWorkflowCancellationResult = {
				requestId: parsed.requestId,
				salesOrderId: parsed.salesOrderId,
				action: parsed.action,
				currentLifecycle: preview.currentLifecycle,
				resultingLifecycle: preview.resultingLifecycle,
				effects: preview.effects,
				idempotentReplay: false,
			};
			const resultJson = result as unknown as Prisma.InputJsonValue;
			await tx.salesHistory.create({
				data: {
					salesId: parsed.salesOrderId,
					name: `Cancelled ${parsed.action} layer`,
					authorName: actor.name,
					data: {
						...cancellationMeta,
						action: parsed.action,
						beforeLifecycle: preview.currentLifecycle,
						resultingLifecycle: preview.resultingLifecycle,
						effects: preview.effects,
						preserved: preview.preserved,
					},
				},
			});
			await tx.salesWorkflowCancellation.create({
				data: {
					requestId: parsed.requestId,
					salesOrderId: parsed.salesOrderId,
					action: parsed.action,
					reason: parsed.reason,
					revision: preview.revision,
					beforeState: {
						currentLifecycle: preview.currentLifecycle,
						orderNo: preview.orderNo,
					},
					result: resultJson,
					performedByUserId: actor.id,
				},
			});
			return result;
		},
		{
			isolationLevel: "Serializable",
			maxWait: 10_000,
			timeout: 30_000,
		},
	);
}
