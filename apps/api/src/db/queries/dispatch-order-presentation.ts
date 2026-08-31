import type { Prisma } from "@gnd/db";
import { getSalesOrderLifecycleStatusInfo } from "@gnd/sales/order-status";
import { repairSalesInvoiceCccDisplay } from "@gnd/sales/payment-system";

export const dispatchOrderPresentationSelect = {
	slug: true,
	status: true,
	prodStatus: true,
	grandTotal: true,
	amountDue: true,
	meta: true,
	payments: {
		where: {
			deletedAt: null,
			reviewStatus: "needs_review",
			status: { in: ["success", "completed", "paid"] },
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: 1,
		select: {
			id: true,
			amount: true,
			origin: true,
			createdAt: true,
			reviewStatus: true,
		},
	},
} satisfies Prisma.SalesOrdersSelect;

type PresentationOrder = Prisma.SalesOrdersGetPayload<{
	select: typeof dispatchOrderPresentationSelect;
}> & {
	id: number;
	orderId: string | null;
	customer?: {
		id?: number | null;
		name?: string | null;
		businessName?: string | null;
		phoneNo?: string | null;
		email?: string | null;
	} | null;
	shippingAddress?: {
		name?: string | null;
		phoneNo?: string | null;
	} | null;
};

type OrderControl = {
	productionStatus?: string | null;
	dispatchStatus?: string | null;
	packed?: QtyLike | number | null;
	pendingPacking?: QtyLike | number | null;
	pendingDispatch?: QtyLike | number | null;
	packables?: QtyLike | number | null;
} | null;

type QtyLike = {
	total?: number | string | null;
	qty?: number | string | null;
};

export function projectDispatchOrderPresentation(
	order: PresentationOrder,
	control: OrderControl,
	fulfillmentStatus?: string | null,
) {
	const repairedInvoice = repairSalesInvoiceCccDisplay({
		baseTotal: Number(order.grandTotal || 0),
		meta: order.meta,
	});
	const productionState =
		control?.productionStatus && control.productionStatus !== "unknown"
			? control.productionStatus
			: order.prodStatus || "pending";
	const projectedFulfillmentStatus =
		control?.dispatchStatus && control.dispatchStatus !== "unknown"
			? control.dispatchStatus
			: fulfillmentStatus || "pending";
	const lifecycle = getSalesOrderLifecycleStatusInfo({
		orderStatus: order.status,
		legacyProductionStatus: order.prodStatus,
		productionStatus: productionState,
		fulfillmentStatus: projectedFulfillmentStatus,
		packed: control?.packed,
		pendingPacking: control?.pendingPacking,
		pendingDispatch: control?.pendingDispatch,
		packables: control?.packables,
	});
	const customerName =
		order.customer?.businessName ||
		order.customer?.name ||
		order.shippingAddress?.name ||
		"Unknown customer";
	const customerPhone =
		order.customer?.phoneNo || order.shippingAddress?.phoneNo || "-";
	const paymentReview = order.payments[0];

	return {
		uuid: order.orderId,
		slug: order.slug,
		customerId: order.customer?.id ?? null,
		customerName,
		customerPhone,
		email: order.customer?.email || null,
		accountNo: order.customer?.phoneNo || null,
		baseInvoiceTotal: repairedInvoice.baseTotal,
		displayCcc: repairedInvoice.ccc,
		invoiceTotal: repairedInvoice.totalWithCcc,
		amountDue: Number(order.amountDue || 0),
		due: Number(order.amountDue || 0) > 0,
		latestPaymentReview: paymentReview
			? {
					paymentId: Number(paymentReview.id),
					amount: Number(paymentReview.amount || 0),
					origin: paymentReview.origin || "office",
					receivedAt: paymentReview.createdAt,
					reviewStatus: paymentReview.reviewStatus || "needs_review",
				}
			: null,
		productionState,
		status: lifecycle.status,
		statusLabel: lifecycle.label,
		statusTone: lifecycle.tone,
	};
}
