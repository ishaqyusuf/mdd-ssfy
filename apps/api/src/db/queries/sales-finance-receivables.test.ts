import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";

import {
	getSalesFinanceReceivableDetail,
	getSalesFinanceReceivables,
	getSalesFinanceReceivablesReport,
	getSalesFinanceReceivablesSummary,
} from "./sales-finance";

const rows = [
	{
		id: 11,
		orderId: "INV-0011",
		slug: "inv-0011",
		createdAt: new Date("2026-01-01T12:00:00.000Z"),
		paymentDueDate: new Date("2000-01-01T12:00:00.000Z"),
		paymentTerm: "Net 30",
		grandTotal: 1_000,
		amountDue: 600,
		invoiceStatus: "outstanding",
		status: "completed",
		customer: {
			id: 7,
			businessName: "Acme Millwork",
			name: "Ada Customer",
		},
		billingAddress: {
			name: "Billing fallback",
			email: "billing@example.com",
			phoneNo: "555-0111",
		},
		salesRep: {
			name: "Sales Rep",
			email: "sales@example.com",
		},
		payments: [
			{
				id: 91,
				amount: 400,
				status: "success",
				createdAt: new Date("2026-01-10T12:00:00.000Z"),
				transaction: {
					txId: "PAY-91",
					paymentMethod: "check",
				},
			},
		],
	},
	{
		id: 12,
		orderId: "INV-0012",
		slug: "inv-0012",
		createdAt: new Date("2026-01-02T12:00:00.000Z"),
		paymentDueDate: new Date("2999-01-01T12:00:00.000Z"),
		paymentTerm: null,
		grandTotal: 500,
		amountDue: 500,
		invoiceStatus: null,
		status: "completed",
		customer: {
			id: 8,
			businessName: null,
			name: "Personal Customer",
		},
		billingAddress: null,
		salesRep: null,
		payments: [],
	},
];

function context() {
	return {
		db: {
			salesOrders: {
				findMany: async () => rows,
				findFirst: async ({ where }: { where: { id: number } }) =>
					rows.find((row) => row.id === where.id) || null,
			},
		},
	} as unknown as TRPCContext;
}

const filters = {
	q: null,
	from: null,
	to: null,
	agingBuckets: null,
};

describe("Sales Finance receivables queries", () => {
	it("returns paginated canonical balances with customer-name precedence", async () => {
		const result = await getSalesFinanceReceivables(context(), {
			...filters,
			cursor: 0,
			size: 20,
			sort: ["amountDue", "desc"],
		});

		expect(result.data).toHaveLength(2);
		expect(result.data[0]?.customerName).toBe("Acme Millwork");
		expect(result.data[0]?.amountDue).toBe(600);
		expect(result.data[0]?.payments[0]?.reference).toBe("PAY-91");
		expect(result.data[1]?.customerName).toBe("Personal Customer");
		expect(result.meta).toEqual({
			count: 2,
			cursor: null,
			hasMore: false,
		});
	});

	it("applies aging filters and summarizes the filtered dataset", async () => {
		const summary = await getSalesFinanceReceivablesSummary(context(), {
			...filters,
			agingBuckets: ["90_plus"],
		});

		expect(summary.receivableCount).toBe(1);
		expect(summary.totalOutstanding).toBe(600);
		expect(summary.overdueAmount).toBe(600);
		expect(summary.bucketAmounts["90_plus"]).toBe(600);
	});

	it("returns invoice and application evidence for the detail sheet", async () => {
		const detail = await getSalesFinanceReceivableDetail(context(), 11);

		expect(detail?.orderNo).toBe("INV-0011");
		expect(detail?.customerName).toBe("Acme Millwork");
		expect(detail?.paidAmount).toBe(400);
		expect(detail?.isBalanceReconciled).toBe(true);
	});

	it("builds filter-aware aging and customer Excel report contracts", async () => {
		const report = await getSalesFinanceReceivablesReport(context(), {
			...filters,
			agingBuckets: ["90_plus"],
			reportType: "receivables-customers",
		});

		expect(report.title).toBe("Receivables by Customer");
		expect(report.rowCount).toBe(1);
		expect(report.sheets.map((sheet) => sheet.name)).toEqual([
			"Report Context",
			"Summary",
			"By Customer",
			"Outstanding Invoices",
		]);
	});
});
