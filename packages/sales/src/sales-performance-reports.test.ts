import { describe, expect, it } from "bun:test";
import {
	SALES_PERFORMANCE_REPORT_TYPES,
	type SalesPerformanceReportInput,
	buildSalesPerformanceReport,
} from "./sales-performance-reports";

const baseInput = {
	context: {
		from: new Date("2026-07-01T00:00:00.000Z"),
		to: new Date("2026-07-31T23:59:59.999Z"),
		salesRepNames: ["Ada Rep"],
		salesChannels: ["direct"],
	},
	summary: {
		bookedSales: 1_500,
		orderCount: 2,
		quoteCount: 1,
		averageOrderValue: 750,
		change: {
			bookedSales: 25,
			orderCount: 0,
			quoteCount: null,
			averageOrderValue: 25,
		},
	},
	orders: [
		{
			id: 1,
			orderNo: "SO-1",
			createdAt: new Date("2026-07-03T12:00:00.000Z"),
			customerId: 101,
			customerName: "Acme",
			salesRepId: 201,
			salesRepName: "Ada Rep",
			salesChannel: "direct",
			lifecycleStatusCode: "in_production",
			lifecycleStatusLabel: "In production",
			priority: "HIGH",
			bookedSales: 1_000,
		},
		{
			id: 2,
			orderNo: "SO-2",
			createdAt: new Date("2026-07-04T12:00:00.000Z"),
			customerId: 101,
			customerName: "Acme",
			salesRepId: 201,
			salesRepName: "Ada Rep",
			salesChannel: "direct",
			lifecycleStatusCode: "fulfilled",
			lifecycleStatusLabel: "Fulfilled",
			priority: "NORMAL",
			bookedSales: 500,
		},
	],
	quotes: [
		{
			id: 3,
			quoteNo: "QT-1",
			createdAt: new Date("2026-07-05T12:00:00.000Z"),
			goodUntil: new Date("2026-08-05T12:00:00.000Z"),
			customerId: 102,
			customerName: "Beta",
			salesRepId: 201,
			salesRepName: "Ada Rep",
			salesChannel: "direct",
			status: "draft",
			quoteValue: 250,
		},
	],
	lineItems: [
		{
			id: 11,
			orderNo: "SO-1",
			createdAt: new Date("2026-07-03T12:00:00.000Z"),
			productId: 301,
			customerName: "Acme",
			salesRepName: "Ada Rep",
			description: "Entry door",
			quantity: 2,
			bookedSales: 1_000,
		},
	],
	trend: [
		{
			date: "Jul 3",
			bookedSales: 1_000,
			orderCount: 1,
			averageOrderValue: 1_000,
		},
	],
} satisfies Omit<SalesPerformanceReportInput, "type">;

const canonicalHeadlines = [
	["cancelled", "Cancelled"],
	["conflict", "Lifecycle conflict"],
	["awaiting_production", "Awaiting production"],
	["production_queued", "Production queued"],
	["in_production", "In production"],
	["awaiting_production_review", "Awaiting production review"],
	["ready_to_fulfill", "Ready to fulfill"],
	["fulfillment_queued", "Fulfillment queued"],
	["packing", "Packing"],
	["packed", "Packed"],
	["in_transit", "In transit"],
	["partially_fulfilled", "Partially fulfilled"],
	["administratively_completed", "Administratively completed"],
	["fulfilled", "Fulfilled"],
	["unknown", "Status unavailable"],
] as const;

describe("sales performance Excel reports", () => {
	it("builds every advertised report with context and summary sheets", () => {
		for (const type of SALES_PERFORMANCE_REPORT_TYPES) {
			const report = buildSalesPerformanceReport({
				...baseInput,
				type,
				generatedAt: new Date("2026-07-30T10:00:00.000Z"),
			});

			expect(report.type).toBe(type);
			expect(report.sheets[0]?.name).toBe("Report Context");
			expect(report.sheets[1]?.name).toBe("Summary");
			expect(report.sheets.length).toBeGreaterThanOrEqual(3);
			expect(report.rowCount).toBeGreaterThan(0);
		}
	});

	it("keeps numeric summary values suitable for Excel formulas", () => {
		const report = buildSalesPerformanceReport({
			...baseInput,
			type: "performance-summary",
		});
		const summary = report.sheets.find((sheet) => sheet.name === "Summary");

		expect(summary?.rows[0]).toMatchObject({
			bookedSales: 1_500,
			orders: 2,
			quotes: 1,
			averageOrderValue: 750,
		});
		expect(report.sheets.at(-1)?.name).toBe("Source Quotes");
	});

	it("exports canonical lifecycle labels for order-based source sheets", () => {
		const orders = canonicalHeadlines.map(([code, label], index) => ({
			...baseInput.orders[0],
			id: index + 1,
			orderNo: `SO-${index + 1}`,
			lifecycleStatusCode: code,
			lifecycleStatusLabel: label,
		}));

		for (const type of [
			"orders-ledger",
			"performance-summary",
			"sales-reps",
			"customers",
		] as const) {
			const report = buildSalesPerformanceReport({
				...baseInput,
				orders,
				type,
			});
			const sheetName =
				type === "orders-ledger" ? "Orders Ledger" : "Source Orders";
			const orderSheet = report.sheets.find(
				(sheet) => sheet.name === sheetName,
			);

			expect(
				orderSheet?.columns.find((column) => column.key === "lifecycleStatus")
					?.label,
			).toBe("Lifecycle Status");
			expect(orderSheet?.rows.map((row) => row.lifecycleStatus)).toEqual(
				canonicalHeadlines.map(([, label]) => label),
			);
			expect(JSON.stringify(orderSheet)).not.toContain('"status":"pending"');
			expect(JSON.stringify(orderSheet)).not.toContain('"status":"completed"');
		}
	});

	it("groups customers, representatives, and products by stable identity", () => {
		const sameLabelInput = {
			...baseInput,
			orders: [
				baseInput.orders[0],
				{
					...baseInput.orders[1],
					customerId: 999,
					salesRepId: 998,
				},
			],
			lineItems: [
				baseInput.lineItems[0],
				{
					...baseInput.lineItems[0],
					id: 12,
					productId: 999,
					orderNo: "SO-2",
				},
			],
		};
		const customers = buildSalesPerformanceReport({
			...sameLabelInput,
			type: "customers",
		});
		const reps = buildSalesPerformanceReport({
			...sameLabelInput,
			type: "sales-reps",
		});
		const products = buildSalesPerformanceReport({
			...sameLabelInput,
			type: "products",
		});

		expect(customers.sheets[2]?.rows).toHaveLength(2);
		expect(reps.sheets[2]?.rows).toHaveLength(2);
		expect(products.sheets[2]?.rows).toHaveLength(2);
	});

	it("groups representative and customer reports with auditable sources", () => {
		const reps = buildSalesPerformanceReport({
			...baseInput,
			type: "sales-reps",
		});
		const customers = buildSalesPerformanceReport({
			...baseInput,
			type: "customers",
		});

		expect(reps.sheets[2]?.rows[0]).toMatchObject({
			salesRep: "Ada Rep",
			orders: 2,
			bookedSales: 1_500,
		});
		expect(reps.sheets.at(-1)?.name).toBe("Source Orders");
		expect(customers.sheets[2]?.rows[0]).toMatchObject({
			customer: "Acme",
			orders: 2,
			bookedSales: 1_500,
		});
		expect(customers.sheets.at(-1)?.rows).toHaveLength(2);
	});

	it("keeps quote activity factual without inventing conversion", () => {
		const report = buildSalesPerformanceReport({
			...baseInput,
			type: "quote-activity",
		});
		const quoteSheet = report.sheets.find(
			(sheet) => sheet.name === "Quote Activity",
		);

		expect(quoteSheet?.rows[0]).toMatchObject({
			quote: "QT-1",
			customer: "Beta",
			quoteValue: 250,
			status: "draft",
		});
		expect(
			quoteSheet?.columns.some((column) => column.key === "conversion"),
		).toBe(false);
	});
});
