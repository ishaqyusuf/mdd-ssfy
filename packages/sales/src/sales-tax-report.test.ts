import { describe, expect, it } from "bun:test";

import {
	buildSalesTaxReport,
	resolveSalesTaxReportPeriod,
} from "./sales-tax-report";

describe("sales tax report period", () => {
	it("derives the first day through an exclusive next-day boundary across DST", () => {
		const period = resolveSalesTaxReportPeriod({
			to: "2026-03-31",
			now: new Date("2026-04-01T16:00:00.000Z"),
		});

		expect(period.fromDate).toBe("2026-03-01");
		expect(period.toDate).toBe("2026-03-31");
		expect(period.from.toISOString()).toBe("2026-03-01T05:00:00.000Z");
		expect(period.toExclusive.toISOString()).toBe("2026-04-01T04:00:00.000Z");
		expect(period.timezone).toBe("America/New_York");
	});

	it("accepts valid month-end dates and rejects invalid report cutoffs", () => {
		for (const to of ["2025-02-28", "2024-02-29", "2026-04-30", "2026-05-31"]) {
			expect(
				resolveSalesTaxReportPeriod({
					to,
					now: new Date("2026-06-01T12:00:00.000Z"),
				}).toDate,
			).toBe(to);
		}
		expect(
			resolveSalesTaxReportPeriod({
				to: "2026-02-25",
				now: new Date("2026-03-01T12:00:00.000Z"),
			}).toDate,
		).toBe("2026-02-25");
		expect(() =>
			resolveSalesTaxReportPeriod({
				to: "2026-02-24",
				now: new Date("2026-03-01T12:00:00.000Z"),
			}),
		).toThrow("25th");
		expect(() =>
			resolveSalesTaxReportPeriod({
				to: "2026-02-30",
				now: new Date("2026-03-01T12:00:00.000Z"),
			}),
		).toThrow("valid calendar date");
		expect(() =>
			resolveSalesTaxReportPeriod({
				to: "2026-04-25",
				now: new Date("2026-04-24T12:00:00.000Z"),
			}),
		).toThrow("future");
		expect(() =>
			resolveSalesTaxReportPeriod({
				to: "04/25/2026",
				now: new Date("2026-05-01T12:00:00.000Z"),
			}),
		).toThrow("YYYY-MM-DD");
	});
});

describe("sales tax workbook", () => {
	it("builds context, summary, and the exact requested detail columns", () => {
		const report = buildSalesTaxReport({
			generatedAt: new Date("2026-04-01T12:00:00.000Z"),
			period: resolveSalesTaxReportPeriod({
				to: "2026-03-31",
				now: new Date("2026-04-01T12:00:00.000Z"),
			}),
			orders: [
				{
					orderNo: "SO-1",
					customerName: "Acme",
					total: 100.105,
					tax: 6.255,
				},
				{
					orderNo: "SO-2",
					customerName: "Walk-in customer",
					total: 25.2,
					tax: 0,
				},
			],
		});

		expect(report.type).toBe("sales-tax");
		expect(report.fileSlug).toBe("tax-2026-03-01-to-2026-03-31");
		expect(report.rowCount).toBe(2);
		expect(report.sheets.map((sheet) => sheet.name)).toEqual([
			"Report Context",
			"Summary",
			"Sales Tax",
		]);
		expect(report.sheets[1]?.rows[0]).toEqual({
			orders: 2,
			salesTotal: 125.31,
			taxTotal: 6.26,
		});
		expect(report.sheets[2]?.columns.map((column) => column.label)).toEqual([
			"Order #",
			"Customer Name",
			"Total",
			"Tax",
		]);
		expect(report.sheets[2]?.rows).toEqual([
			{ orderNo: "SO-1", customerName: "Acme", total: 100.11, tax: 6.26 },
			{
				orderNo: "SO-2",
				customerName: "Walk-in customer",
				total: 25.2,
				tax: 0,
			},
		]);
	});
});
