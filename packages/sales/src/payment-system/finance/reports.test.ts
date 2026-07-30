import { describe, expect, test } from "bun:test";

import {
	type SalesFinanceTransactionSource,
	projectSalesFinanceTransaction,
} from "./projection";
import { SALES_FINANCE_REPORT_TYPES, buildSalesFinanceReport } from "./reports";

function source(
	id: number,
	overrides: Partial<SalesFinanceTransactionSource> = {},
): SalesFinanceTransactionSource {
	return {
		id,
		amount: 103,
		status: "success",
		paymentMethod: "card",
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
						id: 7,
						businessName: "Acme Doors",
					},
				},
			},
		],
		...overrides,
	};
}

const transactions = [
	projectSalesFinanceTransaction(source(1)),
	projectSalesFinanceTransaction(
		source(2, {
			amount: 50,
			paymentMethod: "wire",
			meta: { salesAmount: 50, customerChargeAmount: 50 },
			wallet: null,
			salesPayments: [],
		}),
	),
];

const context = {
	from: new Date("2026-07-01T00:00:00.000Z"),
	to: new Date("2026-07-31T23:59:59.999Z"),
	tab: "all" as const,
	paymentMethods: ["card", "wire"],
};

describe("buildSalesFinanceReport", () => {
	test("implements every advertised report type", () => {
		for (const type of SALES_FINANCE_REPORT_TYPES) {
			const report = buildSalesFinanceReport({
				type,
				transactions,
				context,
				generatedAt: new Date("2026-07-29T12:00:00.000Z"),
			});

			expect(report.type).toBe(type);
			expect(report.sheets[0]?.name).toBe("Report Context");
			expect(report.sheets[1]?.name).toBe("Summary");
			expect(report.sheets.length).toBeGreaterThanOrEqual(3);
		}
	});

	test("keeps numeric summary values suitable for Excel formulas", () => {
		const report = buildSalesFinanceReport({
			type: "payments",
			transactions,
			context,
		});
		const summary = report.sheets.find((sheet) => sheet.name === "Summary");

		expect(summary?.rows[0]).toMatchObject({
			paymentCount: 2,
			received: 153,
			fees: 3,
			net: 153,
			applied: 100,
			unapplied: 50,
			reviewCount: 1,
		});
	});

	test("groups method and customer reports with auditable source rows", () => {
		const methodReport = buildSalesFinanceReport({
			type: "payment-methods",
			transactions,
			context,
		});
		const customerReport = buildSalesFinanceReport({
			type: "customers",
			transactions,
			context,
		});

		expect(
			methodReport.sheets.find((sheet) => sheet.name === "By Payment Method")
				?.rows,
		).toHaveLength(2);
		expect(
			customerReport.sheets.find((sheet) => sheet.name === "By Customer")?.rows,
		).toHaveLength(2);
		expect(
			customerReport.sheets.find((sheet) => sheet.name === "Source Payments")
				?.rows,
		).toHaveLength(2);
	});

	test("limits exception reports to transactions that need review", () => {
		const report = buildSalesFinanceReport({
			type: "exceptions",
			transactions,
			context,
		});
		const exceptions = report.sheets.find(
			(sheet) => sheet.name === "Review Exceptions",
		);

		expect(report.rowCount).toBe(1);
		expect(exceptions?.rows).toHaveLength(1);
		expect(exceptions?.rows[0]?.reviewReasons).toContain("Missing Customer");
		expect(exceptions?.rows[0]?.reviewReasons).toContain("Missing Reference");
	});

	test("records active filters in the report context sheet", () => {
		const report = buildSalesFinanceReport({
			type: "applications",
			transactions,
			context,
			generatedAt: new Date("2026-07-29T12:00:00.000Z"),
		});
		const contextRows = report.sheets[0]?.rows || [];

		expect(contextRows).toContainEqual({
			field: "Payment Methods",
			value: "Card, Wire",
		});
		expect(contextRows).toContainEqual({
			field: "Generated At",
			value: "2026-07-29T12:00:00.000Z",
		});
	});
});
