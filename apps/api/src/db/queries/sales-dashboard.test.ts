import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";

import {
	formatSalesDashboardDate,
	getRevenueOverTime,
	getSalesDashboardCreatedAtRange,
	getSalesPerformanceReport,
	getSalesTaxReport,
} from "./sales-dashboard";

describe("sales dashboard date filters", () => {
	it("normalizes date-only filters to inclusive calendar-day bounds", () => {
		const range = getSalesDashboardCreatedAtRange({
			from: "2026-06-09",
			to: "2026-06-09",
		});

		expect(formatSalesDashboardDate(range.gte)).toBe("2026-06-09");
		expect(formatSalesDashboardDate(range.lte)).toBe("2026-06-09");
		expect(range.gte.getHours()).toBe(0);
		expect(range.gte.getMinutes()).toBe(0);
		expect(range.lte.getHours()).toBe(23);
		expect(range.lte.getMinutes()).toBe(59);
	});

	it("keeps same-day revenue in the selected rawDate bucket", async () => {
		const records = [
			{
				createdAt: new Date(2026, 5, 9, 0, 0, 0, 0),
				grandTotal: 25,
			},
			{
				createdAt: new Date(2026, 5, 9, 23, 59, 59, 999),
				grandTotal: 75,
			},
			{
				createdAt: new Date(2026, 5, 10, 0, 0, 0, 0),
				grandTotal: 999,
			},
		];

		const ctx = {
			db: {
				salesOrders: {
					findMany: async ({
						where,
					}: {
						where: { createdAt?: { gte?: Date; lte?: Date } };
					}) =>
						records.filter((record) => {
							const createdAt = where.createdAt;
							return (
								(!createdAt?.gte || record.createdAt >= createdAt.gte) &&
								(!createdAt?.lte || record.createdAt <= createdAt.lte)
							);
						}),
				},
			},
		};

		const data = await getRevenueOverTime(ctx as unknown as TRPCContext, {
			from: "2026-06-09",
			to: "2026-06-09",
		});

		expect(data).toEqual([
			{
				averageOrderValue: 50,
				bucketTo: "2026-06-09",
				date: "Jun 9",
				granularity: "day",
				orders: 2,
				rawDate: "2026-06-09",
				revenue: 100,
			},
		]);
	});
});

describe("sales tax report query", () => {
	it("exports immutable recognition snapshots without consulting payments", async () => {
		let dashboardBookedSalesWhere: Record<string, unknown> | undefined;
		const ctx = {
			db: {
				salesOrders: {
					aggregate: async ({ where }: { where: Record<string, unknown> }) => {
						dashboardBookedSalesWhere = where;
						return { _sum: { grandTotal: 310.75 } };
					},
					count: async ({ where }: { where: { type?: string } }) =>
						where.type === "order" ? 2 : 0,
				},
				salesTaxLedgerEntry: {
					findMany: async () => {
						return [
							{
								id: "tax-4",
								salesOrderId: 4,
								entryType: "SALE",
								recognitionSource: "DELIVERY",
								recognizedAt: new Date("2026-03-12T15:00:00Z"),
								orderNo: "SO-4",
								customerName: "Acme",
								invoiceTotalCents: 24_050,
								grossSalesCents: 22_525,
								exemptSalesCents: 0,
								taxableAmountCents: 22_525,
								stateTaxCents: 1_352,
								surtaxCents: 173,
								taxDueCents: 1_525,
								taxCode: "A,B",
							},
							{
								id: "tax-5",
								salesOrderId: 5,
								entryType: "SALE",
								recognitionSource: "PICKUP",
								recognizedAt: new Date("2026-03-20T16:00:00Z"),
								orderNo: "SO-5",
								customerName: "Walk-in customer",
								invoiceTotalCents: 2_000,
								grossSalesCents: 2_000,
								exemptSalesCents: 2_000,
								taxableAmountCents: 0,
								stateTaxCents: 0,
								surtaxCents: 0,
								taxDueCents: 0,
								taxCode: null,
							},
						];
					},
				},
			},
		};

		const report = await getSalesTaxReport(
			ctx as unknown as TRPCContext,
			{ from: "2026-03-10", to: "2026-03-31" },
			new Date("2026-04-01T12:00:00.000Z"),
		);

		expect(report.sheets[2]?.rows).toEqual([
			{ orderNo: "SO-4", customerName: "Acme", total: 240.5, tax: 15.25 },
			{
				orderNo: "SO-5",
				customerName: "Walk-in customer",
				total: 20,
				tax: 0,
			},
		]);
		expect(report.sheets[1]?.rows[0]).toMatchObject({
			dashboardBookedSales: 310.75,
			taxRecognizedInvoiceTotal: 260.5,
		});
		expect(dashboardBookedSalesWhere).toMatchObject({
			deletedAt: null,
			type: "order",
			createdAt: {
				gte: new Date(2026, 2, 10, 0, 0, 0, 0),
				lte: new Date(2026, 2, 31, 23, 59, 59, 999),
			},
		});
		expect(dashboardBookedSalesWhere).not.toHaveProperty("salesRepId");
		expect(dashboardBookedSalesWhere).not.toHaveProperty("salesChannel");
		expect(JSON.stringify(report)).not.toContain("amountDue");
	});

	it("rejects a report that would silently truncate tax ledger entries", async () => {
		const ctx = {
			db: {
				salesOrders: {
					aggregate: async () => ({ _sum: { grandTotal: 0 } }),
					count: async () => 0,
				},
				salesTaxLedgerEntry: {
					findMany: async () =>
						Array.from({ length: 10_001 }, (_, index) => ({
							id: `tax-${index + 1}`,
							salesOrderId: index + 1,
							entryType: "SALE",
							recognitionSource: "MANUAL_BACKFILL",
							recognizedAt: new Date("2026-03-20T16:00:00Z"),
							orderNo: `SO-${index + 1}`,
							customerName: "Walk-in customer",
							invoiceTotalCents: 100,
							grossSalesCents: 100,
							exemptSalesCents: 100,
							taxableAmountCents: 0,
							stateTaxCents: 0,
							surtaxCents: 0,
							taxDueCents: 0,
							taxCode: null,
						})),
				},
			},
		};

		await expect(
			getSalesTaxReport(
				ctx as unknown as TRPCContext,
				{ from: "2026-03-01", to: "2026-03-31" },
				new Date("2026-04-01T12:00:00.000Z"),
			),
		).rejects.toThrow("more than 10,000 tax ledger entries");
	});
});

describe("sales performance report query", () => {
	it("exports the canonical lifecycle headline instead of the legacy order status", async () => {
		let pipelineReads = 0;
		const ctx = {
			db: {
				salesOrders: {
					aggregate: async () => ({ _sum: { grandTotal: 100 } }),
					count: async ({ where }: { where: { type?: string } }) =>
						where.type === "order" ? 1 : 0,
					findMany: async (args: { select?: Record<string, unknown> }) => {
						if (args.select?.itemControls) {
							pipelineReads += 1;
							return [
								{
									id: 1,
									orderId: "SO-1",
									status: "completed",
									prodStatus: "completed",
									deletedAt: null,
									archivedAt: null,
									grandTotal: 100,
									amountDue: 100,
									updatedAt: new Date("2026-07-02T12:00:00.000Z"),
									inventoryProjection: null,
									stat: [],
									completionRecords: [],
									itemControls: [
										{
											uid: "item-1",
											produceable: true,
											shippable: true,
											qtyControls: [
												{
													type: "qty",
													total: 1,
													itemTotal: 1,
													qty: 1,
													updatedAt: new Date("2026-07-02T12:00:00.000Z"),
												},
											],
										},
									],
									assignments: [],
									deliveries: [],
								},
							];
						}

						return [
							{
								id: 1,
								orderId: "SO-1",
								createdAt: new Date("2026-07-02T12:00:00.000Z"),
								grandTotal: 100,
								customerId: null,
								salesRepId: null,
								salesChannel: "direct",
								priority: "NORMAL",
								customer: null,
								billingAddress: null,
								salesRep: null,
							},
						];
					},
				},
				users: { findMany: async () => [] },
			},
		};

		const report = await getSalesPerformanceReport(
			ctx as unknown as TRPCContext,
			{
				from: "2026-07-01",
				to: "2026-07-31",
				reportType: "orders-ledger",
			},
		);

		expect(pipelineReads).toBe(1);
		expect(report.sheets[2]?.rows[0]).toMatchObject({
			lifecycleStatus: "Awaiting production",
		});
		expect(JSON.stringify(report.sheets[2])).not.toContain(
			'"status":"completed"',
		);
	});

	it("fails closed when canonical lifecycle resolution is unavailable", async () => {
		const ctx = {
			db: {
				salesOrders: {
					aggregate: async () => ({ _sum: { grandTotal: 100 } }),
					count: async ({ where }: { where: { type?: string } }) =>
						where.type === "order" ? 1 : 0,
					findMany: async (args: { select?: Record<string, unknown> }) =>
						args.select?.itemControls
							? []
							: [
									{
										id: 1,
										orderId: "SO-1",
										createdAt: new Date("2026-07-02T12:00:00.000Z"),
										grandTotal: 100,
										customerId: null,
										salesRepId: null,
										salesChannel: "direct",
										priority: "NORMAL",
										customer: null,
										billingAddress: null,
										salesRep: null,
									},
								],
				},
				users: { findMany: async () => [] },
			},
		};

		await expect(
			getSalesPerformanceReport(ctx as unknown as TRPCContext, {
				from: "2026-07-01",
				to: "2026-07-31",
				reportType: "orders-ledger",
			}),
		).rejects.toThrow("canonical lifecycle status could not be resolved");
	});

	it("rejects order workbooks above the existing 10,000-row limit", async () => {
		const ctx = {
			db: {
				salesOrders: {
					aggregate: async () => ({ _sum: { grandTotal: 0 } }),
					count: async () => 0,
					findMany: async () =>
						Array.from({ length: 10_001 }, (_, index) => ({
							id: index + 1,
							orderId: `SO-${index + 1}`,
							createdAt: new Date("2026-07-02T12:00:00.000Z"),
							grandTotal: 0,
							customerId: null,
							salesRepId: null,
							salesChannel: "direct",
							priority: "NORMAL",
							customer: null,
							billingAddress: null,
							salesRep: null,
						})),
				},
				users: { findMany: async () => [] },
			},
		};

		await expect(
			getSalesPerformanceReport(ctx as unknown as TRPCContext, {
				from: "2026-07-01",
				to: "2026-07-31",
				reportType: "orders-ledger",
			}),
		).rejects.toThrow("more than 10,000 source records");
	});
});
