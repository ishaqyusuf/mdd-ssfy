import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";

import {
	formatSalesDashboardDate,
	getRevenueOverTime,
	getSalesDashboardCreatedAtRange,
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
