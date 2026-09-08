import type { Db, Prisma } from "@gnd/db";
import { repairSalesInvoiceCccDisplay } from "./payment-system/domain/display-ccc";

export const productionInvoiceSelect = {
	id: true,
	grandTotal: true,
	amountDue: true,
	meta: true,
	customer: { select: { id: true, phoneNo: true } },
	shippingAddress: { select: { phoneNo: true } },
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

export function projectProductionInvoice(
	order: Prisma.SalesOrdersGetPayload<{
		select: typeof productionInvoiceSelect;
	}>,
) {
	const invoice = repairSalesInvoiceCccDisplay({
		baseTotal: Number(order.grandTotal || 0),
		meta: order.meta,
	});
	const review = order.payments[0];
	return {
		id: order.id,
		customerId: order.customer?.id ?? null,
		customerPhone:
			order.customer?.phoneNo || order.shippingAddress?.phoneNo || "-",
		accountNo: order.customer?.phoneNo || null,
		baseInvoiceTotal: invoice.baseTotal,
		displayCcc: invoice.ccc,
		invoiceTotal: invoice.totalWithCcc,
		amountDue: Number(order.amountDue || 0),
		due: Number(order.amountDue || 0) > 0,
		latestPaymentReview: review
			? {
					paymentId: Number(review.id),
					amount: Number(review.amount || 0),
					origin: review.origin || "office",
					receivedAt: review.createdAt,
					reviewStatus: review.reviewStatus || "needs_review",
				}
			: null,
	};
}

export async function withProductionInvoices<T extends { id: number }>(
	db: Db,
	rows: T[],
	enabled: boolean,
) {
	const invoices =
		enabled && rows.length
			? await db.salesOrders.findMany({
					where: { id: { in: rows.map((row) => row.id) }, deletedAt: null },
					select: productionInvoiceSelect,
				})
			: [];
	const byId = new Map(
		invoices.map((order) => [order.id, projectProductionInvoice(order)]),
	);
	return rows.map((row) => ({
		...row,
		invoicePresentation: byId.get(row.id) ?? null,
	}));
}
