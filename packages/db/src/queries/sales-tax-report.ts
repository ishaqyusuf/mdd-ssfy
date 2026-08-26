import type { Database } from "../index";

type SalesTaxReportQueryDb = Pick<Database, "salesOrders">;

export type ListSalesTaxReportOrdersInput = {
	from: Date;
	toExclusive: Date;
	limit: number;
};

const FULLY_PAID_ORDER_BALANCE = { lte: 0 } as const;

export function listSalesTaxReportOrders(
	db: SalesTaxReportQueryDb,
	input: ListSalesTaxReportOrdersInput,
) {
	return db.salesOrders.findMany({
		where: {
			amountDue: FULLY_PAID_ORDER_BALANCE,
			deletedAt: null,
			type: "order",
			createdAt: { gte: input.from, lt: input.toExclusive },
		},
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		take: input.limit + 1,
		select: {
			id: true,
			orderId: true,
			grandTotal: true,
			tax: true,
			customer: { select: { businessName: true, name: true } },
			billingAddress: { select: { name: true } },
		},
	});
}
