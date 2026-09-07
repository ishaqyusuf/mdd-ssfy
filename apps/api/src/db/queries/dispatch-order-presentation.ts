import type { Prisma } from "@gnd/db";
import { repairSalesInvoiceCccDisplay } from "@gnd/sales/payment-system";
import type { SalesPipelineSnapshot } from "@gnd/sales/sales-pipeline";

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
	_control: OrderControl,
	_fulfillmentStatus?: string | null,
	options?: {
		pipeline?: SalesPipelineSnapshot | null;
	},
) {
	const repairedInvoice = repairSalesInvoiceCccDisplay({
		baseTotal: Number(order.grandTotal || 0),
		meta: order.meta,
	});
	const selectedPipeline = options?.pipeline ?? null;
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
		productionState: selectedPipeline?.production.state ?? "unknown",
		status: selectedPipeline?.headline.code ?? "unknown",
		statusLabel: selectedPipeline?.headline.label ?? "Status unavailable",
		statusTone: selectedPipeline?.headline.tone ?? "stone",
	};
}
