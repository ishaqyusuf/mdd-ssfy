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
	it("preserves stored totals and customer-name fallbacks", async () => {
		const ctx = {
			db: {
				salesOrders: {
					findMany: async () => {
						return [
							{
								id: 4,
								orderId: "SO-4",
								grandTotal: 240.5,
								tax: 15.25,
								customer: { businessName: "Acme", name: "Ada" },
								billingAddress: { name: "Billing name" },
							},
							{
								id: 5,
								orderId: "SO-5",
								grandTotal: 20,
								tax: 1,
								customer: { businessName: null, name: "Ada Customer" },
								billingAddress: { name: "Billing name" },
							},
							{
								id: 6,
								orderId: "SO-6",
								grandTotal: 10,
								tax: 0,
								customer: null,
								billingAddress: { name: "Billing customer" },
							},
							{
								id: 7,
								orderId: "SO-7",
								grandTotal: null,
								tax: null,
								customer: null,
								billingAddress: null,
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
				customerName: "Ada Customer",
				total: 20,
				tax: 1,
			},
			{
				orderNo: "SO-6",
				customerName: "Billing customer",
				total: 10,
				tax: 0,
			},
			{
				orderNo: "SO-7",
				customerName: "Walk-in customer",
				total: 0,
				tax: 0,
			},
		]);
	});

	it("rejects a report that would silently truncate source orders", async () => {
		const ctx = {
			db: {
				salesOrders: {
					findMany: async () =>
						Array.from({ length: 10_001 }, (_, index) => ({
							id: index + 1,
							orderId: `SO-${index + 1}`,
							grandTotal: 1,
							tax: 0,
							customer: null,
							billingAddress: null,
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
		).rejects.toThrow("more than 10,000 orders");
	});
});
