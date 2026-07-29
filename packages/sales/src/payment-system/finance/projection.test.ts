import { describe, expect, test } from "bun:test";

import {
	type SalesFinanceTransactionSource,
	projectSalesFinanceTransaction,
	summarizeSalesFinanceTransactions,
} from "./projection";

function transaction(
	overrides: Partial<SalesFinanceTransactionSource> = {},
): SalesFinanceTransactionSource {
	return {
		id: 42,
		amount: 103,
		status: "Success",
		paymentMethod: "credit-card",
		createdAt: new Date("2026-07-28T12:00:00.000Z"),
		meta: {
			salesAmount: 100,
			feeAmount: 3,
			customerChargeAmount: 103,
		},
		wallet: {
			accountNo: "AC-100",
			customer: {
				id: 7,
				businessName: "Acme Doors",
				name: "Ada Customer",
			},
		},
		salesPayments: [
			{
				id: 1,
				amount: 100,
				status: "success",
				order: {
					id: 10,
					orderId: "SO-100",
					customer: {
						id: 7,
						businessName: "Acme Doors",
						name: "Ada Customer",
					},
					salesRep: {
						name: "Sam Sales",
					},
				},
			},
		],
		...overrides,
	};
}

describe("projectSalesFinanceTransaction", () => {
	test("uses the wallet business name before the personal name", () => {
		const result = projectSalesFinanceTransaction(transaction());

		expect(result.customerName).toBe("Acme Doors");
		expect(result.customerId).toBe(7);
		expect(result.receivedAmount).toBe(103);
		expect(result.principalAmount).toBe(100);
		expect(result.feeAmount).toBe(3);
		expect(result.appliedAmount).toBe(100);
		expect(result.applicationStatus).toBe("applied");
		expect(result.exceptionCodes).toEqual([]);
	});

	test("falls back to personal name", () => {
		const result = projectSalesFinanceTransaction(
			transaction({
				wallet: {
					customer: {
						id: 7,
						businessName: " ",
						name: "Ada Customer",
					},
				},
			}),
		);

		expect(result.customerName).toBe("Ada Customer");
	});

	test("deduplicates order customers for multi-invoice transactions", () => {
		const result = projectSalesFinanceTransaction(
			transaction({
				wallet: null,
				amount: 200,
				meta: { salesAmount: 200, customerChargeAmount: 200 },
				salesPayments: [
					{
						id: 1,
						amount: 100,
						order: {
							id: 10,
							orderId: "SO-100",
							customer: { name: "Ada Customer" },
						},
					},
					{
						id: 2,
						amount: 100,
						order: {
							id: 11,
							orderId: "SO-101",
							customer: { name: "Ada Customer" },
						},
					},
				],
			}),
		);

		expect(result.customerName).toBe("Ada Customer");
		expect(result.orderNos).toEqual(["SO-100", "SO-101"]);
		expect(result.appliedAmount).toBe(200);
	});

	test("flags missing customer data and unapplied money for review", () => {
		const result = projectSalesFinanceTransaction(
			transaction({
				wallet: null,
				paymentMethod: "check",
				meta: { salesAmount: 100, customerChargeAmount: 100 },
				salesPayments: [],
			}),
		);

		expect(result.customerName).toBeNull();
		expect(result.applicationStatus).toBe("unapplied");
		expect(result.exceptionCodes).toEqual([
			"missing_customer",
			"missing_reference",
			"application_mismatch",
		]);
		expect(result.needsReview).toBe(true);
	});

	test("summarizes the same canonical money fields used by the ledger", () => {
		const paid = projectSalesFinanceTransaction(transaction());
		const unapplied = projectSalesFinanceTransaction(
			transaction({
				id: 43,
				amount: 50,
				meta: { salesAmount: 50, customerChargeAmount: 50 },
				salesPayments: [],
				refundTx: [{ refund: { total: 10 } }],
			}),
		);

		expect(summarizeSalesFinanceTransactions([paid, unapplied])).toEqual({
			receivedAmount: 153,
			refundedAmount: 10,
			netAmount: 143,
			feeAmount: 3,
			unappliedAmount: 50,
			transactionCount: 2,
			reviewCount: 1,
		});
	});
});
