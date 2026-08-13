import type { TransactionClient } from "@gnd/db";
import { buildSpecialOrderApprovalRevision } from "./domain";

export async function invalidateSpecialOrderRevisionsForCustomerChange(
	db: TransactionClient,
	input: {
		customerId?: number | null;
		salesOrderId?: number | null;
		reason: string;
		actorUserId?: number | null;
		authorName?: string | null;
		changeFingerprint: unknown;
	},
) {
	const orders = await db.salesOrders.findMany({
		where: {
			deletedAt: null,
			type: "order",
			specialOrderDeclaration: "YES",
			...(input.salesOrderId
				? { id: input.salesOrderId }
				: { customerId: input.customerId ?? undefined }),
		},
		select: {
			id: true,
			specialOrderRevision: true,
			specialOrderStatus: true,
			currentSpecialOrderApprovalId: true,
		},
	});
	const changedAt = new Date();
	for (const order of orders) {
		const nextRevision = buildSpecialOrderApprovalRevision({
			priorRevision: order.specialOrderRevision,
			customerVisibleChange: input.changeFingerprint,
		});
		await db.specialOrderApprovalRequest.updateMany({
			where: { salesOrderId: order.id, status: "ACTIVE" },
			data: {
				status: "REVOKED",
				revokedAt: changedAt,
				revokedReason: "CUSTOMER_VISIBLE_ORDER_CHANGED",
			},
		});
		await db.specialOrderApprovalEvidence.updateMany({
			where: { salesOrderId: order.id, supersededAt: null },
			data: {
				supersededAt: changedAt,
				supersededReason: input.reason,
				supersededByUserId: input.actorUserId ?? null,
			},
		});
		const hadEvidence =
			Boolean(order.currentSpecialOrderApprovalId) ||
			order.specialOrderStatus === "CUSTOMER_DECLINED";
		await db.salesOrders.update({
			where: { id: order.id },
			data: {
				specialOrderRevision: nextRevision,
				specialOrderStatus: hadEvidence
					? "REAPPROVAL_REQUIRED"
					: "SIGNATURE_PENDING",
				currentSpecialOrderRequestId: null,
				currentSpecialOrderApprovalId: null,
			},
		});
		await db.salesHistory.create({
			data: {
				salesId: order.id,
				name: "Special Order customer-visible details changed",
				authorName: input.authorName || "System",
				data: {
					reason: input.reason,
					priorRevision: order.specialOrderRevision,
					nextRevision,
					approvalInvalidated: hadEvidence,
				},
			},
		});
	}
	return { invalidatedOrderCount: orders.length };
}
