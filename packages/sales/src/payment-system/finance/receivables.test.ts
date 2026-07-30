import { describe, expect, it } from "bun:test";

import {
	type SalesFinanceReceivableSource,
	getSalesFinanceAgingBucket,
	projectSalesFinanceReceivable,
	summarizeSalesFinanceReceivables,
} from "./receivables";

const asOf = new Date("2026-07-29T12:00:00.000Z");

function source(
	overrides: Partial<SalesFinanceReceivableSource> = {},
): SalesFinanceReceivableSource {
	return {
		id: 10,
		orderId: "ORD-0010",
		createdAt: new Date("2026-06-01T12:00:00.000Z"),
		paymentDueDate: new Date("2026-07-15T12:00:00.000Z"),
		grandTotal: 1_000,
		amountDue: 600,
		customer: {
			id: 4,
			businessName: "Acme Millwork",
			name: "Ada Customer",
		},
		billingAddress: {
			name: "Billing fallback",
			email: "billing@example.com",
			phoneNo: "555-0100",
		},
		payments: [
			{
				id: 44,
				amount: 400,
				status: "success",
				createdAt: new Date("2026-07-10T12:00:00.000Z"),
				transaction: {
					txId: "PAY-44",
					paymentMethod: "check",
				},
			},
		],
		...overrides,
	};
}

describe("Sales Finance receivables projection", () => {
	it("uses business name, personal name, billing name, then the unnamed fallback", () => {
		expect(projectSalesFinanceReceivable(source(), asOf).customerName).toBe(
			"Acme Millwork",
		);
		expect(
			projectSalesFinanceReceivable(
				source({
					customer: { id: 4, businessName: null, name: "Ada Customer" },
				}),
				asOf,
			).customerName,
		).toBe("Ada Customer");
		expect(
			projectSalesFinanceReceivable(
				source({
					customer: { id: 4, businessName: null, name: null },
				}),
				asOf,
			).customerName,
		).toBe("Billing fallback");
		expect(
			projectSalesFinanceReceivable(
				source({
					customer: null,
					billingAddress: null,
				}),
				asOf,
			).customerName,
		).toBeNull();
	});

	it("uses successful applications for the canonical open balance", () => {
		const result = projectSalesFinanceReceivable(
			source({
				amountDue: 700,
				payments: [
					{ amount: 400, status: "success" },
					{ amount: 300, status: "pending" },
				],
			}),
			asOf,
		);

		expect(result.grandTotal).toBe(1_000);
		expect(result.paidAmount).toBe(400);
		expect(result.amountDue).toBe(600);
		expect(result.storedAmountDue).toBe(700);
		expect(result.balanceDifference).toBe(100);
		expect(result.isBalanceReconciled).toBe(false);
	});

	it("assigns stable current and overdue aging boundaries", () => {
		expect(
			getSalesFinanceAgingBucket(new Date("2026-07-29"), asOf).agingBucket,
		).toBe("current");
		expect(
			getSalesFinanceAgingBucket(new Date("2026-07-28"), asOf).agingBucket,
		).toBe("1_30");
		expect(
			getSalesFinanceAgingBucket(new Date("2026-06-29"), asOf).agingBucket,
		).toBe("1_30");
		expect(
			getSalesFinanceAgingBucket(new Date("2026-06-28"), asOf).agingBucket,
		).toBe("31_60");
		expect(
			getSalesFinanceAgingBucket(new Date("2026-05-29"), asOf).agingBucket,
		).toBe("61_90");
		expect(
			getSalesFinanceAgingBucket(new Date("2026-04-29"), asOf).agingBucket,
		).toBe("90_plus");
		expect(getSalesFinanceAgingBucket(null, asOf)).toEqual({
			agingBucket: "current",
			daysOverdue: null,
			isOverdue: false,
		});
	});

	it("summarizes open balances, aging, customers, and reconciliation", () => {
		const current = projectSalesFinanceReceivable(
			source({
				id: 11,
				orderId: "ORD-0011",
				paymentDueDate: new Date("2026-08-10"),
				grandTotal: 500,
				amountDue: 500,
				payments: [],
			}),
			asOf,
		);
		const overdue = projectSalesFinanceReceivable(source(), asOf);
		const paid = projectSalesFinanceReceivable(
			source({
				id: 12,
				orderId: "ORD-0012",
				grandTotal: 100,
				amountDue: 0,
				payments: [{ amount: 100, status: "success" }],
			}),
			asOf,
		);

		expect(summarizeSalesFinanceReceivables([current, overdue, paid])).toEqual({
			receivableCount: 2,
			customerCount: 1,
			totalOutstanding: 1_100,
			overdueAmount: 600,
			currentAmount: 500,
			unreconciledCount: 0,
			bucketAmounts: {
				current: 500,
				"1_30": 600,
				"31_60": 0,
				"61_90": 0,
				"90_plus": 0,
			},
			bucketCounts: {
				current: 1,
				"1_30": 1,
				"31_60": 0,
				"61_90": 0,
				"90_plus": 0,
			},
		});
	});
});
