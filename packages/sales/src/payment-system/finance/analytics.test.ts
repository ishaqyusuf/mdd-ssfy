import { describe, expect, test } from "bun:test";

import {
	buildSalesFinanceAnalytics,
	getSalesFinanceAnalyticsRangeDays,
} from "./analytics";
import { projectSalesFinanceTransaction } from "./projection";

function transaction(input: {
	id: number;
	date: string;
	amount: number;
	method?: string;
	refund?: number;
	review?: boolean;
}) {
	return projectSalesFinanceTransaction({
		id: input.id,
		amount: input.amount,
		status: "success",
		paymentMethod: input.method || "cash",
		createdAt: new Date(input.date),
		meta: {
			salesAmount: input.amount,
			customerChargeAmount: input.amount,
		},
		wallet: input.review
			? null
			: {
					customer: {
						id: input.id,
						businessName: `Customer ${input.id}`,
					},
				},
		salesPayments: input.review
			? []
			: [
					{
						id: input.id,
						amount: input.amount,
						order: {
							id: input.id,
							orderId: `SO-${input.id}`,
							customer: { name: `Customer ${input.id}` },
						},
					},
				],
		refundTx: input.refund ? [{ refund: { total: input.refund } }] : undefined,
	});
}

describe("buildSalesFinanceAnalytics", () => {
	test("creates a continuous daily collections trend with canonical money", () => {
		const analytics = buildSalesFinanceAnalytics({
			from: new Date("2026-07-01T00:00:00.000Z"),
			to: new Date("2026-07-03T23:59:59.999Z"),
			transactions: [
				transaction({
					id: 1,
					date: "2026-07-01T12:00:00.000Z",
					amount: 100,
					refund: 10,
				}),
				transaction({
					id: 2,
					date: "2026-07-03T12:00:00.000Z",
					amount: 50,
				}),
			],
		});

		expect(analytics.period.granularity).toBe("day");
		expect(analytics.trend).toHaveLength(3);
		expect(analytics.trend.map((point) => point.transactionCount)).toEqual([
			1, 0, 1,
		]);
		expect(analytics.trend[0]).toMatchObject({
			receivedAmount: 100,
			refundedAmount: 10,
			netAmount: 90,
		});
	});

	test("uses bounded weekly and monthly buckets for longer periods", () => {
		const weekly = buildSalesFinanceAnalytics({
			from: new Date("2026-01-01T00:00:00.000Z"),
			to: new Date("2026-03-31T23:59:59.999Z"),
			transactions: [],
		});
		const monthly = buildSalesFinanceAnalytics({
			from: new Date("2025-01-15T00:00:00.000Z"),
			to: new Date("2026-07-20T23:59:59.999Z"),
			transactions: [],
		});

		expect(weekly.period.granularity).toBe("week");
		expect(weekly.trend.length).toBeLessThanOrEqual(13);
		expect(monthly.period.granularity).toBe("month");
		expect(monthly.trend).toHaveLength(19);
		expect(
			getSalesFinanceAnalyticsRangeDays(monthly.period.from, monthly.period.to),
		).toBe(552);
	});

	test("groups payment method mix and review aging from the filtered dataset", () => {
		const analytics = buildSalesFinanceAnalytics({
			from: new Date("2026-06-01T00:00:00.000Z"),
			to: new Date("2026-07-29T23:59:59.999Z"),
			transactions: [
				transaction({
					id: 1,
					date: "2026-07-27T12:00:00.000Z",
					amount: 75,
					method: "cash",
				}),
				transaction({
					id: 2,
					date: "2026-07-18T12:00:00.000Z",
					amount: 25,
					method: "card",
					review: true,
				}),
				transaction({
					id: 3,
					date: "2026-06-15T12:00:00.000Z",
					amount: 100,
					method: "cash",
					review: true,
				}),
			],
		});

		expect(analytics.methodMix.map((method) => method.paymentMethod)).toEqual([
			"cash",
			"card",
		]);
		expect(analytics.methodMix.map((method) => method.share)).toEqual([
			87.5, 12.5,
		]);
		expect(
			analytics.reviewAge.map((bucket) => bucket.transactionCount),
		).toEqual([0, 1, 0, 1]);
		expect(analytics.reviewReasons[0]).toMatchObject({
			code: "missing_customer",
			transactionCount: 2,
			exposureAmount: 125,
		});
	});
});
