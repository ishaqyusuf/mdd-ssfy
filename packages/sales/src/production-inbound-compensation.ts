import { Prisma, type Db, type TransactionClient } from "@gnd/db";
import { AppError } from "@gnd/errors";
import {
	changedReceiptRows,
	type ProductionReceiptState,
} from "./production-inbound-audit";
import { cancelFullWorkflowCompletionInTransaction } from "./sales-completion";
import { resetSalesAction } from "./sales-control/actions";

function conflict(message: string): never {
	throw new AppError({ code: "CONFLICT", publicMessage: message });
}

/** The caller must lock, authorize and compare the live state before compensation. */
export async function compensateProductionReceipt(
	tx: TransactionClient,
	input: {
		before: ProductionReceiptState;
		after: ProductionReceiptState;
		receiptId: number;
		actorId: number;
		requestId: string;
	},
) {
	const { before, after } = input;
	const now = new Date();
	const payroll = changedReceiptRows(before.payroll, after.payroll);
	if (
		payroll.some(
			({ after: row }) => row.status !== "PENDING" || row.payoutId != null,
		)
	)
		conflict(
			"Receipt payroll has entered payment processing. Contact an administrator.",
		);
	const completions = changedReceiptRows(before.completions, after.completions);
	if (
		completions.some(
			(change) =>
				change.before || change.after.completionMethod !== "FULL_WORKFLOW",
		)
	)
		conflict("Completion history cannot be reversed by this receipt.");

	for (const { before: prior, after: row } of changedReceiptRows(
		before.allocations,
		after.allocations,
	)) {
		if (row.orderDeliveryId || ["picked", "consumed"].includes(row.status))
			conflict(
				"Receipt materials have entered packing or dispatch. Open Inventory to review them.",
			);
		await tx.stockAllocation.update({
			where: { id: row.id },
			data: prior
				? {
						qty: prior.qty,
						status: prior.status,
						inventoryStockId: prior.inventoryStockId,
						notes: prior.notes,
						deletedAt: prior.deletedAt,
					}
				: { deletedAt: now },
		});
	}
	for (const { before: prior, after: row } of changedReceiptRows(
		before.stocks,
		after.stocks,
	)) {
		const qty = prior?.qty ?? 0;
		if (qty > row.qty) conflict("Receipt stock evidence cannot be reversed.");
		// Retain the physical stock row and append an opposite movement for traceability.
		await tx.inventoryStock.update({
			where: { id: row.id },
			data: {
				qty,
				price: prior ? prior.price : row.price,
				deletedAt: prior ? prior.deletedAt : null,
			},
		});
		await tx.stockMovement.create({
			data: {
				inventoryVariantId: row.inventoryVariantId,
				prevQty: row.qty,
				currentQty: qty,
				changeQty: qty - row.qty,
				type: "adjustment",
				status: "completed",
				reference: `production-receipt-cancel:${input.receiptId}`,
				notes: `Reversed Production receipt #${input.receiptId}`,
				authorName: String(input.actorId),
			},
		});
	}
	for (const { before: prior, after: row } of changedReceiptRows(
		before.demands,
		after.demands,
	)) {
		if (!prior) conflict("Receipt demand provenance is incomplete.");
		await tx.inboundDemand.update({
			where: { id: row.id },
			data: {
				qtyReceived: prior.qtyReceived,
				status: prior.status,
				notes: prior.notes,
				deletedAt: prior.deletedAt,
			},
		});
	}
	for (const { before: prior, after: row } of changedReceiptRows(
		before.items,
		after.items,
	)) {
		if (!prior) conflict("Receipt item provenance is incomplete.");
		await tx.inboundShipmentItem.update({
			where: { id: row.id },
			data: {
				qtyGood: prior.qtyGood,
				qtyIssue: prior.qtyIssue,
				unitPrice: prior.unitPrice,
			},
		});
	}
	await tx.inboundShipment.update({
		where: { id: before.shipment.id },
		data: {
			status: before.shipment.status,
			receivedAt: before.shipment.receivedAt,
			progress: before.shipment.progress,
		},
	});
	for (const { before: prior, after: row } of changedReceiptRows(
		before.components,
		after.components,
	)) {
		if (!prior) conflict("Receipt material provenance is incomplete.");
		await tx.lineItemComponents.update({
			where: { id: row.id },
			data: {
				qtyAllocated: prior.qtyAllocated,
				qtyInbound: prior.qtyInbound,
				qtyReceived: prior.qtyReceived,
				status: prior.status,
			},
		});
	}
	for (const { before: prior, after: row } of changedReceiptRows(
		before.reviews,
		after.reviews,
	)) {
		if (!prior || prior.status !== "PENDING" || row.status !== "APPROVED")
			conflict("Receipt review provenance is incomplete.");
		await tx.salesProductionSubmissionMaterialReview.update({
			where: { id: row.id },
			data: {
				status: prior.status,
				reviewedById: prior.reviewedById,
				reviewedAt: prior.reviewedAt,
				decisionNote: prior.decisionNote,
				materialRevision: prior.materialRevision,
				assignmentScope:
					prior.assignmentScope === null
						? Prisma.JsonNull
						: (prior.assignmentScope as Prisma.InputJsonValue),
				resolution:
					prior.resolution === null
						? Prisma.DbNull
						: (prior.resolution as Prisma.InputJsonValue),
			},
		});
	}
	for (const { before: prior, after: row } of payroll)
		await tx.payroll.update({
			where: { id: row.id },
			data: prior
				? {
						amount: prior.amount,
						deletedAt: prior.deletedAt,
					}
				: { deletedAt: now },
		});
	for (const { before: prior, after: row } of changedReceiptRows(
		before.payments,
		after.payments,
	)) {
		if (!prior) conflict("Receipt payment provenance is incomplete.");
		await tx.salesPayments.update({
			where: { id: row.id },
			data: {
				reviewStatus: prior.reviewStatus,
				reviewedAt: prior.reviewedAt,
				reviewedById: prior.reviewedById,
				reviewMethod: prior.reviewMethod,
				reviewedByAction: prior.reviewedByAction,
				reviewNote: prior.reviewNote,
			},
		});
	}
	for (const { after: row } of completions)
		await cancelFullWorkflowCompletionInTransaction(tx, {
			salesOrderId: row.salesOrderId,
			milestone: row.milestone,
			requestId: `${input.requestId}:${row.milestone}`,
			reason: `Production receipt #${input.receiptId} cancelled`,
			cancelledAt: now,
			actor: { id: input.actorId, name: String(input.actorId) },
		});
	await resetSalesAction(tx as Db, before.order.id);
	await tx.salesOrders.update({
		where: { id: before.order.id },
		data: { inventoryStatus: before.order.inventoryStatus },
	});
}
