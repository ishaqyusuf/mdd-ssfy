import { describe, expect, test } from "bun:test";
import type { SalesPerformanceWorkbookReport } from "@gnd/sales/performance-reports";
import {
	getSalesWorkbookFileName,
	isSalesWorkbookReport,
	toSalesWorkbookSheetMatrix,
} from "./sales-workbook-export";

const report: SalesPerformanceWorkbookReport = {
	type: "orders-ledger",
	title: "Orders Ledger",
	description: "Filtered orders",
	fileSlug: "orders-ledger",
	generatedAt: new Date("2026-07-30T12:34:56.000Z"),
	rowCount: 1,
	sheets: [
		{
			name: "Orders",
			columns: [
				{ key: "date", label: "Date", type: "date-time", width: 20 },
				{ key: "amount", label: "Amount", type: "money", width: 16 },
			],
			rows: [{ date: "2026-07-30T12:00:00.000Z", amount: 125.5 }],
		},
	],
};

describe("Sales Excel workbook export", () => {
	test("creates a deterministic report filename", () => {
		expect(getSalesWorkbookFileName(report)).toBe(
			"sales-orders-ledger-2026-07-30T12-34-56.xlsx",
		);
	});

	test("keeps numeric money and real date values in the worksheet matrix", () => {
		const sheet = report.sheets[0];
		if (!sheet) throw new Error("Expected a report sheet.");
		const matrix = toSalesWorkbookSheetMatrix(sheet);
		expect(matrix[0]).toEqual(["Date", "Amount"]);
		expect(matrix[1]?.[0] instanceof Date).toBe(true);
		expect(matrix[1]?.[1]).toBe(125.5);
	});

	test("guards the serialized workbook contract before export", () => {
		expect(isSalesWorkbookReport(report)).toBe(true);
		expect(isSalesWorkbookReport({ type: "sales-tax" })).toBe(false);
	});

	test("names a sales tax workbook with its selected period", () => {
		expect(
			getSalesWorkbookFileName({
				type: "sales-tax",
				fileSlug: "tax-2026-08-01-to-2026-08-31",
				generatedAt: new Date("2026-09-01T12:00:00.000Z"),
			}),
		).toBe("sales-tax-2026-08-01-to-2026-08-31.xlsx");
	});
});
