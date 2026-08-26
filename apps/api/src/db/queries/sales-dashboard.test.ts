import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";

import {
	formatSalesDashboardDate,
	getRevenueOverTime,
	getSalesDashboardCreatedAtRange,
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
		const ctx = {
			db: {
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
		expect(JSON.stringify(report)).not.toContain("amountDue");
	});

	it("rejects a report that would silently truncate tax ledger entries", async () => {
		const ctx = {
			db: {
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
