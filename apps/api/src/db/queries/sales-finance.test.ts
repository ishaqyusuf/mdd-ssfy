import { describe, expect, test } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import type { SalesFinanceTransactionSource } from "@gnd/sales/payment-system";

import {
	getSalesFinanceAnalytics,
	getSalesFinanceReport,
	getSalesFinanceTransactions,
} from "./sales-finance";

function source(
	id: number,
	overrides: Partial<SalesFinanceTransactionSource> = {},
): SalesFinanceTransactionSource {
	return {
		id,
		amount: 100,
		status: "success",
		paymentMethod: "cash",
		createdAt: new Date("2026-07-29T12:00:00.000Z"),
		meta: { salesAmount: 100, customerChargeAmount: 100 },
		wallet: {
			customer: {
				id,
				businessName: `Business ${id}`,
				name: `Person ${id}`,
			},
		},
		salesPayments: [
			{
				id,
				amount: 100,
				order: {
					id,
					orderId: `SO-${id}`,
					customer: {
						id,
						businessName: `Business ${id}`,
						name: `Person ${id}`,
					},
				},
			},
		],
		...overrides,
	};
}

describe("getSalesFinanceTransactions", () => {
	test("projects customer precedence, fallbacks, deduplication, and missing data", async () => {
		const rows = [
			source(1),
			source(2, {
				wallet: {
					customer: {
						id: 2,
						businessName: " ",
						name: "Personal Customer",
					},
				},
			}),
			source(3, {
				wallet: null,
				amount: 200,
				meta: { salesAmount: 200, customerChargeAmount: 200 },
				salesPayments: [
					{
						id: 31,
						amount: 100,
						order: {
							id: 31,
							orderId: "SO-31",
							customer: { name: "Shared Customer" },
						},
					},
					{
						id: 32,
						amount: 100,
						order: {
							id: 32,
							orderId: "SO-32",
							customer: { name: "Shared Customer" },
						},
					},
				],
			}),
			source(4, {
				wallet: null,
				paymentMethod: "check",
				salesPayments: [],
			}),
		];
		const ctx = {
			db: {
				customerTransaction: {
					findMany: async () => rows,
				},
				event: {
					findMany: async () => [],
				},
			},
		} as unknown as TRPCContext;

		const result = await getSalesFinanceTransactions(ctx, {
			tab: "all",
			size: 50,
			from: "2026-07-01",
			to: "2026-07-31",
		});
		const byId = new Map(result.data.map((row) => [row.id, row]));

		expect(byId.get(1)?.customerName).toBe("Business 1");
		expect(byId.get(2)?.customerName).toBe("Personal Customer");
		expect(byId.get(3)?.customerName).toBe("Shared Customer");
		expect(byId.get(3)?.orderNos).toEqual(["SO-31", "SO-32"]);
		expect(byId.get(4)?.customerName).toBeNull();
		expect(byId.get(4)?.exceptionCodes).toContain("missing_customer");
		expect(result.meta.count).toBe(4);
	});
});

describe("getSalesFinanceAnalytics", () => {
	test("builds analytics from the same filtered canonical dataset", async () => {
		const rows = [
			source(1),
			source(2, { paymentMethod: "card" }),
			source(3, {
				wallet: null,
				salesPayments: [],
			}),
		];
		const ctx = {
			db: {
				customerTransaction: {
					findMany: async () => rows,
				},
				event: {
					findMany: async () => [],
				},
			},
		} as unknown as TRPCContext;

		const result = await getSalesFinanceAnalytics(ctx, {
			tab: "review",
			from: "2026-07-01",
			to: "2026-07-31",
			paymentMethods: ["cash"],
		});

		expect(result.transactionCount).toBe(1);
		expect(result.reviewCount).toBe(1);
		expect(result.methodMix).toEqual([
			expect.objectContaining({
				paymentMethod: "cash",
				transactionCount: 1,
				receivedAmount: 100,
				share: 100,
			}),
		]);
		expect(result.reviewReasons.map((reason) => reason.code)).toEqual([
			"missing_customer",
			"application_mismatch",
		]);
	});
});

describe("getSalesFinanceReport", () => {
	test("builds a filter-aware customer workbook contract from the canonical dataset", async () => {
		const rows = [
			source(1),
			source(2, {
				wallet: {
					customer: {
						id: 2,
						businessName: " ",
						name: "Personal Customer",
					},
				},
			}),
			source(3, {
				paymentMethod: "card",
			}),
			source(4, {
				wallet: null,
				salesPayments: [],
			}),
		];
		const ctx = {
			db: {
				customerTransaction: {
					findMany: async () => rows,
				},
				event: {
					findMany: async () => [],
				},
			},
		} as unknown as TRPCContext;

		const result = await getSalesFinanceReport(ctx, {
			tab: "all",
			reportType: "customers",
			from: "2026-07-01",
			to: "2026-07-31",
			paymentMethods: ["cash"],
		});

		expect(result.type).toBe("customers");
		expect(result.rowCount).toBe(3);
		expect(result.sheets.map((sheet) => sheet.name)).toEqual([
			"Report Context",
			"Summary",
			"By Customer",
			"Source Payments",
		]);
		expect(result.sheets[0]?.rows).toContainEqual({
			field: "Payment Methods",
			value: "Cash",
		});
		expect(result.sheets[2]?.rows.map((row) => row.customer)).toContain(
			"Unnamed customer",
		);
	});
});
