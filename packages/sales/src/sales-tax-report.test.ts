import { describe, expect, it } from "bun:test";

import {
	buildSalesTaxReport,
	resolveSalesTaxReportPeriod,
} from "./sales-tax-report";

describe("sales tax report period", () => {
	it("derives the first day through an exclusive next-day boundary across DST", () => {
		const period = resolveSalesTaxReportPeriod({
			from: "2026-03-01",
			to: "2026-03-31",
			now: new Date("2026-04-01T16:00:00.000Z"),
		});

		expect(period.fromDate).toBe("2026-03-01");
		expect(period.toDate).toBe("2026-03-31");
		expect(period.from.toISOString()).toBe("2026-03-01T05:00:00.000Z");
		expect(period.toExclusive.toISOString()).toBe("2026-04-01T04:00:00.000Z");
		expect(period.timezone).toBe("America/New_York");
	});

	it("accepts arbitrary non-future ranges and rejects invalid boundaries", () => {
		for (const to of ["2025-02-28", "2024-02-29", "2026-04-30", "2026-05-31"]) {
			expect(
				resolveSalesTaxReportPeriod({
					from: to,
					to,
					now: new Date("2026-06-01T12:00:00.000Z"),
				}).toDate,
			).toBe(to);
		}
		expect(() =>
			resolveSalesTaxReportPeriod({
				from: "2026-02-01",
				to: "2026-02-30",
				now: new Date("2026-03-01T12:00:00.000Z"),
			}),
		).toThrow("valid calendar date");
		expect(() =>
			resolveSalesTaxReportPeriod({
				from: "2026-04-01",
				to: "2026-04-25",
				now: new Date("2026-04-24T12:00:00.000Z"),
			}),
		).toThrow("future");
		expect(() =>
			resolveSalesTaxReportPeriod({
				from: "2026-04-01",
				to: "04/25/2026",
				now: new Date("2026-05-01T12:00:00.000Z"),
			}),
		).toThrow("YYYY-MM-DD");
		expect(() =>
			resolveSalesTaxReportPeriod({
				from: "2026-04-26",
				to: "2026-04-25",
				now: new Date("2026-05-01T12:00:00.000Z"),
			}),
		).toThrow("start date must be on or before");
	});
});

describe("sales tax workbook", () => {
	it("builds accrual context, Florida summary, detail, and recognition audit", () => {
		const report = buildSalesTaxReport({
			generatedAt: new Date("2026-04-01T12:00:00.000Z"),
			dashboardBookedSales: 180.42,
			period: resolveSalesTaxReportPeriod({
				from: "2026-03-01",
				to: "2026-03-31",
				now: new Date("2026-04-01T12:00:00.000Z"),
			}),
			entries: [
				{
					salesOrderId: 1,
					orderNo: "SO-1",
					customerName: "Acme",
					recognizedAt: "2026-03-12T16:00:00.000Z",
					entryType: "SALE",
					recognitionSource: "DELIVERY",
					taxCode: "A,B",
					total: 100.105,
					grossSales: 93.85,
					exemptSales: 0,
					taxableAmount: 93.85,
					stateTax: 5.63,
					surtax: 0.625,
					tax: 6.255,
				},
				{
					salesOrderId: 2,
					orderNo: "SO-2",
					customerName: "Walk-in customer",
					recognizedAt: "2026-03-20T18:00:00.000Z",
					entryType: "SALE",
					recognitionSource: "PICKUP",
					taxCode: null,
					total: 25.2,
					grossSales: 25.2,
					exemptSales: 25.2,
					taxableAmount: 0,
					stateTax: 0,
					surtax: 0,
					tax: 0,
				},
			],
		});

		expect(report.type).toBe("sales-tax");
		expect(report.fileSlug).toBe("tax-2026-03-01-to-2026-03-31");
		expect(report.rowCount).toBe(2);
		expect(report.sheets.map((sheet) => sheet.name)).toEqual([
			"Report Context",
			"Florida Summary",
			"Sales Tax",
			"Recognition Audit",
		]);
		expect(report.sheets[1]?.rows[0]).toEqual({
			taxRecognizedOrders: 2,
			dashboardBookedSales: 180.42,
			taxRecognizedInvoiceTotal: 125.31,
			grossSales: 119.05,
			exemptSales: 25.2,
			taxableAmount: 93.85,
			stateTax: 5.63,
			surtax: 0.63,
			taxTotal: 6.26,
		});
		expect(report.sheets[0]?.rows).toContainEqual({
			field: "Dashboard comparison",
			value: "Booked by order creation date; tax totals use recognition date",
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
		expect(report.sheets[3]?.rows[0]).toMatchObject({
			recognizedAt: "2026-03-12T16:00:00.000Z",
			orderNo: "SO-1",
			entryType: "SALE",
			recognitionSource: "DELIVERY",
		});
	});

	it("keeps the dashboard comparison when no tax sale was recognized", () => {
		const report = buildSalesTaxReport({
			dashboardBookedSales: 450,
			period: resolveSalesTaxReportPeriod({
				from: "2026-03-01",
				to: "2026-03-31",
				now: new Date("2026-04-01T12:00:00.000Z"),
			}),
			entries: [],
		});

		expect(report.rowCount).toBe(0);
		expect(report.sheets[1]?.rows[0]).toMatchObject({
			dashboardBookedSales: 450,
			taxRecognizedOrders: 0,
			taxRecognizedInvoiceTotal: 0,
		});
	});
});
