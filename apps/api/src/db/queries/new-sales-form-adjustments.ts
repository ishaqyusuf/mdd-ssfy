import { createHash } from "node:crypto";
import type {
	CreateNewSalesFormAdjustmentSchema,
	GetNewSalesFormAdjustmentApprovalSchema,
	PreviewNewSalesFormAdjustmentSchema,
	RespondNewSalesFormAdjustmentApprovalSchema,
} from "@api/schemas/new-sales-form";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import {
	analyzeSalesFormChange,
	calculateSalesAdjustmentSettlement,
} from "@gnd/sales/adjustment-system";
import { projectLegacyOrderPayments } from "@gnd/sales/payment-system";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { getNewSalesForm } from "./new-sales-form";

const ACTIVE_ADJUSTMENT_STATUSES = [
	"DRAFT",
	"PENDING_CUSTOMER",
	"APPROVED",
	"APPLYING",
] as const;

export type NewSalesFormChangeProtection = {
	paymentTotal: number;
	paymentCount: number;
	refundablePaymentCount: number;
	allocatedQty: number;
	inboundQty: number;
	productionQty: number;
	fulfilledQty: number;
	lines: Array<{
		uid: string;
		salesOrderItemId: number;
		allocatedQty: number;
		inboundQty: number;
		productionQty: number;
		completedProductionQty: number;
		fulfilledQty: number;
		minimumAllowedQty: number;
	}>;
};

export type NewSalesFormActiveAdjustment = {
	id: string;
	status: string;
	direction: string;
	proposedGrandTotal: number;
	walletCreditAmount: number;
	amountDueAfter: number;
	createdAt: string;
};

function hash(value: string) {
	return createHash("sha256").update(value).digest("hex");
}

function json(value: unknown): Prisma.InputJsonValue {
	return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function readRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function lineUid(item: { id: number; meta: unknown }) {
	const uid = readRecord(item.meta).uid;
	return typeof uid === "string" && uid ? uid : `sales-item-${item.id}`;
}

export async function getNewSalesFormCommitmentSnapshot(
	db: TRPCContext["db"],
	salesOrderId: number,
): Promise<NewSalesFormChangeProtection> {
	const order = await db.salesOrders.findFirst({
		where: { id: salesOrderId, deletedAt: null },
		select: {
			id: true,
			grandTotal: true,
			payments: {
				where: { deletedAt: null },
				select: { amount: true, status: true, transactionId: true },
			},
			items: {
				where: { deletedAt: null },
				select: {
					id: true,
					meta: true,
					assignments: {
						where: { deletedAt: null },
						select: { qtyAssigned: true, qtyCompleted: true },
					},
					itemDeliveries: {
						where: { deletedAt: null },
						select: { qty: true, status: true },
					},
					lineItem: {
						select: {
							components: {
								select: {
									qtyAllocated: true,
									qtyInbound: true,
									qtyReceived: true,
									stockAllocations: {
										where: { deletedAt: null, status: { not: "cancelled" } },
										select: { qty: true, status: true },
									},
									inboundDemands: {
										where: { deletedAt: null, status: { not: "cancelled" } },
										select: { qty: true, qtyReceived: true, status: true },
									},
								},
							},
						},
					},
				},
			},
		},
	});
	if (!order) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Sales order not found.",
		});
	}

	const paymentProjection = projectLegacyOrderPayments({
		salesOrderId: order.id,
		grandTotal: order.grandTotal,
		payments: order.payments,
	});
	const lines = order.items.map((item) => {
		const productionQty = item.assignments.reduce(
			(total, row) => total + Number(row.qtyAssigned || 0),
			0,
		);
		const completedProductionQty = item.assignments.reduce(
			(total, row) => total + Number(row.qtyCompleted || 0),
			0,
		);
		const fulfilledQty = item.itemDeliveries
			.filter((row) => String(row.status || "").toLowerCase() !== "cancelled")
			.reduce((total, row) => total + Number(row.qty || 0), 0);
		const components = item.lineItem?.components || [];
		const allocatedQty = components.reduce(
			(total, row) =>
				total +
				Math.max(
					Number(row.qtyAllocated || 0),
					row.stockAllocations.reduce(
						(sum, allocation) => sum + Number(allocation.qty || 0),
						0,
					),
				),
			0,
		);
		const inboundQty = components.reduce(
			(total, row) =>
				total +
				Math.max(
					Number(row.qtyInbound || 0),
					row.inboundDemands.reduce(
						(sum, demand) =>
							sum +
							Math.max(
								0,
								Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
							),
						0,
					),
				),
			0,
		);
		return {
			uid: lineUid(item),
			salesOrderItemId: item.id,
			allocatedQty,
			inboundQty,
			productionQty,
			completedProductionQty,
			fulfilledQty,
			minimumAllowedQty: Math.max(completedProductionQty, fulfilledQty),
		};
	});

	return {
		paymentTotal: paymentProjection.totalAllocated,
		paymentCount: order.payments.length,
		refundablePaymentCount: order.payments.filter(
			(payment) =>
				payment.status === "success" &&
				Number(payment.amount || 0) > 0 &&
				payment.transactionId != null,
		).length,
		allocatedQty: lines.reduce((total, line) => total + line.allocatedQty, 0),
		inboundQty: lines.reduce((total, line) => total + line.inboundQty, 0),
		productionQty: lines.reduce((total, line) => total + line.productionQty, 0),
		fulfilledQty: lines.reduce((total, line) => total + line.fulfilledQty, 0),
		lines,
	};
}

export async function getNewSalesFormAdjustmentStatus(
	db: TRPCContext["db"],
	salesOrderId: number,
): Promise<NewSalesFormActiveAdjustment | null> {
	const adjustment = await db.salesOrderAdjustment.findFirst({
		where: { salesOrderId, status: { in: [...ACTIVE_ADJUSTMENT_STATUSES] } },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			status: true,
			direction: true,
			proposedGrandTotal: true,
			walletCreditAmount: true,
			amountDueAfter: true,
			createdAt: true,
		},
	});
	return adjustment
		? {
				...adjustment,
				proposedGrandTotal: Number(adjustment.proposedGrandTotal),
				walletCreditAmount: Number(adjustment.walletCreditAmount),
				amountDueAfter: Number(adjustment.amountDueAfter),
				createdAt: adjustment.createdAt.toISOString(),
			}
		: null;
}

async function buildNewSalesFormAdjustmentPreview(
	ctx: TRPCContext,
	input: PreviewNewSalesFormAdjustmentSchema,
) {
	const baseline = await getNewSalesForm(ctx, {
		type: input.type,
		slug: input.slug || String(input.salesId),
	});
	if (baseline.salesId !== input.salesId) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Sales order identity changed. Reload the form.",
		});
	}
	if (baseline.version !== input.version) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "The sale changed elsewhere. Reload before reviewing changes.",
		});
	}
	const commitments = await getNewSalesFormCommitmentSnapshot(
		ctx.db,
		input.salesId,
	);
	const analysis = analyzeSalesFormChange({
		before: baseline,
		after: input,
		commitments,
	});
	const settlement = calculateSalesAdjustmentSettlement({
		beforeGrandTotal: analysis.beforeGrandTotal,
		afterGrandTotal: analysis.afterGrandTotal,
		paymentTotal: commitments.paymentTotal,
	});
	const commitmentByUid = new Map(
		commitments.lines.map((line) => [line.uid, line]),
	);
	const commitmentByItemId = new Map(
		commitments.lines.map((line) => [line.salesOrderItemId, line]),
	);
	const blockedLines = analysis.lines.flatMap((line) => {
		const commitment =
			commitmentByUid.get(line.uid) ||
			(line.id ? commitmentByItemId.get(line.id) : undefined);
		return commitment && line.afterQty < commitment.minimumAllowedQty
			? [
					{
						uid: line.uid,
						title: line.title,
						proposedQty: line.afterQty,
						minimumAllowedQty: commitment.minimumAllowedQty,
					},
				]
			: [];
	});
	return {
		baseline,
		proposed: input,
		commitments,
		analysis,
		settlement,
		blockedLines,
	};
}

export async function previewNewSalesFormAdjustment(
	ctx: TRPCContext,
	input: PreviewNewSalesFormAdjustmentSchema,
) {
	const { commitments, analysis, settlement, blockedLines } =
		await buildNewSalesFormAdjustmentPreview(ctx, input);
	return { commitments, analysis, settlement, blockedLines };
}

export async function createNewSalesFormAdjustment(
	ctx: TRPCContext,
	input: CreateNewSalesFormAdjustmentSchema,
) {
	if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
	const preview = await buildNewSalesFormAdjustmentPreview(ctx, input);
	if (preview.analysis.direction === "NONE") {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "No quantity changes were found.",
		});
	}
	if (preview.blockedLines.length) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"A proposed quantity is below an already completed or fulfilled quantity.",
		});
	}
	if (preview.analysis.lines.some((line) => !line.id)) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Sales-rep-approved changes currently support quantity edits to existing sale items only.",
		});
	}
	if (
		preview.settlement.walletCredit > 0 &&
		(!preview.baseline.form.customerId ||
			preview.commitments.refundablePaymentCount < 1)
	) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"This reduction would create wallet credit, but the sale has no customer and transaction-linked successful payment to reconcile.",
		});
	}
	const sourceHash = hash(JSON.stringify(preview.baseline));
	const proposalHash = hash(
		JSON.stringify({
			lineItems: input.lineItems,
			extraCosts: input.extraCosts,
			summary: input.summary,
		}),
	);
	const idempotencyKey = `new-sales-form:${input.salesId}:${input.version}:${proposalHash}`;
	const existing = await ctx.db.salesOrderAdjustment.findUnique({
		where: { idempotencyKey },
		select: { id: true, status: true },
	});
	if (existing) {
		let status = existing.status;
		if (status === "PENDING_CUSTOMER") {
			const approvedAt = new Date();
			const approved = await ctx.db.$transaction(async (tx) => {
				const changed = await tx.salesOrderAdjustment.updateMany({
					where: { id: existing.id, status: "PENDING_CUSTOMER" },
					data: {
						status: "APPROVED",
						approvedAt,
						appliedById: ctx.userId,
					},
				});
				if (changed.count) {
					await tx.salesOrderAdjustmentApproval.updateMany({
						where: { adjustmentId: existing.id, status: "PENDING" },
						data: {
							status: "REVOKED",
							respondedAt: approvedAt,
							responseNote:
								"Superseded by authenticated sales-representative approval.",
						},
					});
				}
				return changed.count > 0;
			});
			if (approved) {
				status = "APPROVED";
			} else {
				const current = await ctx.db.salesOrderAdjustment.findUnique({
					where: { id: existing.id },
					select: { status: true },
				});
				status = current?.status || status;
			}
		}
		if (status === "APPROVED") {
			await tasks.trigger("apply-sales-order-adjustment", {
				adjustmentId: existing.id,
			});
		}
		return {
			id: existing.id,
			status,
			approvalToken: null,
			approvalExpiresAt: null,
			preview: {
				commitments: preview.commitments,
				analysis: preview.analysis,
				settlement: preview.settlement,
				blockedLines: preview.blockedLines,
			},
		};
	}
	const approvedAt = new Date();
	const adjustment = await ctx.db.salesOrderAdjustment.create({
		data: {
			salesOrderId: input.salesId,
			direction: preview.analysis.direction as
				| "INCREASE"
				| "REDUCTION"
				| "MIXED",
			status: "APPROVED",
			sourceVersion: input.version,
			sourceHash,
			idempotencyKey,
			reason: input.reason,
			beforeSnapshot: json(preview.baseline),
			proposedSnapshot: json(input),
			commitmentSnapshot: json(preview.commitments),
			settlementSnapshot: json(preview.settlement),
			beforeGrandTotal: preview.analysis.beforeGrandTotal,
			proposedGrandTotal: preview.analysis.afterGrandTotal,
			paymentTotal: preview.commitments.paymentTotal,
			amountDueAfter: preview.settlement.amountDue,
			walletCreditAmount: preview.settlement.walletCredit,
			requestedById: ctx.userId,
			submittedById: ctx.userId,
			appliedById: ctx.userId,
			submittedAt: approvedAt,
			approvedAt,
			lines: {
				create: preview.analysis.lines.map((line) => ({
					lineUid: line.uid,
					salesOrderItemId: line.id,
					title: line.title,
					beforeQty: line.beforeQty,
					proposedQty: line.afterQty,
					quantityDelta: line.quantityDelta,
					beforeLineTotal: line.beforeLineTotal,
					proposedLineTotal: line.afterLineTotal,
					lineTotalDelta: line.lineTotalDelta,
					commitmentSnapshot: json(
						preview.commitments.lines.find(
							(row) =>
								row.uid === line.uid ||
								(Boolean(line.id) && row.salesOrderItemId === line.id),
						) || {},
					),
				})),
			},
		},
		select: { id: true, status: true },
	});
	await tasks.trigger("apply-sales-order-adjustment", {
		adjustmentId: adjustment.id,
	});
	return {
		...adjustment,
		approvalToken: null,
		approvalExpiresAt: null,
		preview: {
			commitments: preview.commitments,
			analysis: preview.analysis,
			settlement: preview.settlement,
			blockedLines: preview.blockedLines,
		},
	};
}

export async function getNewSalesFormAdjustmentApproval(
	ctx: TRPCContext,
	input: GetNewSalesFormAdjustmentApprovalSchema,
) {
	const approval = await ctx.db.salesOrderAdjustmentApproval.findUnique({
		where: { tokenHash: hash(input.token) },
		select: {
			status: true,
			expiresAt: true,
			adjustment: {
				select: {
					id: true,
					status: true,
					direction: true,
					reason: true,
					beforeGrandTotal: true,
					proposedGrandTotal: true,
					amountDueAfter: true,
					walletCreditAmount: true,
					lines: true,
					order: { select: { orderId: true, slug: true } },
				},
			},
		},
	});
	if (!approval)
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Approval request not found.",
		});
	return approval;
}

export async function respondNewSalesFormAdjustmentApproval(
	ctx: TRPCContext,
	input: RespondNewSalesFormAdjustmentApprovalSchema,
) {
	const tokenHash = hash(input.token);
	const result = await ctx.db.$transaction(async (tx) => {
		const approval = await tx.salesOrderAdjustmentApproval.findUnique({
			where: { tokenHash },
			select: { id: true, status: true, expiresAt: true, adjustmentId: true },
		});
		if (!approval)
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Approval request not found.",
			});
		if (approval.status !== "PENDING") {
			return { adjustmentId: approval.adjustmentId, status: approval.status };
		}
		if (approval.expiresAt <= new Date()) {
			await tx.salesOrderAdjustmentApproval.update({
				where: { id: approval.id },
				data: { status: "EXPIRED", respondedAt: new Date() },
			});
			await tx.salesOrderAdjustment.update({
				where: { id: approval.adjustmentId },
				data: { status: "EXPIRED" },
			});
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "This approval request has expired.",
			});
		}
		const approved = input.decision === "APPROVE";
		const decisionStatus = approved ? "APPROVED" : "REJECTED";
		const claimed = await tx.salesOrderAdjustmentApproval.updateMany({
			where: { id: approval.id, status: "PENDING" },
			data: {
				status: decisionStatus,
				responseNote: input.note,
				evidence: { userAgent: input.userAgent || null },
				respondedAt: new Date(),
			},
		});
		if (!claimed.count) {
			const current = await tx.salesOrderAdjustmentApproval.findUnique({
				where: { id: approval.id },
				select: { status: true },
			});
			return {
				adjustmentId: approval.adjustmentId,
				status: current?.status || "REJECTED",
			};
		}
		const changedAdjustment = await tx.salesOrderAdjustment.updateMany({
			where: {
				id: approval.adjustmentId,
				status: "PENDING_CUSTOMER",
			},
			data: {
				status: decisionStatus,
				approvedAt: approved ? new Date() : null,
			},
		});
		if (!changedAdjustment.count) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "This adjustment is no longer waiting for approval.",
			});
		}
		return {
			adjustmentId: approval.adjustmentId,
			status: decisionStatus,
		};
	});
	if (result.status === "APPROVED") {
		await tasks.trigger("apply-sales-order-adjustment", {
			adjustmentId: result.adjustmentId,
		});
	}
	return result;
}
