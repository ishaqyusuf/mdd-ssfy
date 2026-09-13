import { describe, expect, test } from "bun:test";

import {
	ASSISTANT_ANALYTICS_RESULT_VERSION,
	assistantAnalyticsPartSchema,
	assistantAnalyticsResultSchema,
} from "./analytics-result-contract";

const result = {
	version: ASSISTANT_ANALYTICS_RESULT_VERSION,
	metric: "sales.revenueByPeriod",
	title: "Sales revenue by period",
	definition:
		"Current non-deleted order totals grouped by the actor's calendar period; currencies remain separate.",
	presentation: "area",
	rows: [
		{
			label: "2026-09",
			value: 42500,
			drilldown: { label: "View orders", href: "/sales?month=2026-09" },
		},
	],
	dateRange: { from: "2026-09-01", to: "2026-09-30", timezone: "UTC" },
	unit: "currency",
	currency: "USD",
	freshness: { observedAt: "2026-09-13T12:00:00.000Z", label: "Live" },
	sources: [{ id: "sales-orders-v1", label: "Sales orders" }],
} as const;

describe("assistant analytics result contract", () => {
	test("accepts a bounded catalog-backed analytics part", () => {
		expect(
			assistantAnalyticsPartSchema.parse({
				type: "data-assistant-analytics",
				id: "analytics-call-1",
				data: result,
			}),
		).toEqual({
			type: "data-assistant-analytics",
			id: "analytics-call-1",
			data: result,
		});
	});

	test("rejects forged metadata, remote drilldowns, and oversized results", () => {
		expect(() =>
			assistantAnalyticsResultSchema.parse({
				...result,
				title: "Lifetime value",
			}),
		).toThrow("semantic catalog");
		expect(() =>
			assistantAnalyticsResultSchema.parse({
				...result,
				rows: [
					{
						label: "2026-09",
						value: 1,
						drilldown: {
							label: "Unsafe",
							href: "https://example.com/private",
						},
					},
				],
			}),
		).toThrow();
		expect(() =>
			assistantAnalyticsResultSchema.parse({
				...result,
				rows: [
					{
						label: "unsafe",
						value: 1,
						drilldown: { label: "Unsafe", href: "/\\evil.example/path" },
					},
				],
			}),
		).toThrow();
		expect(() =>
			assistantAnalyticsResultSchema.parse({
				...result,
				presentation: "kpi",
				rows: [
					{ label: "one", value: 1 },
					{ label: "two", value: 2 },
				],
			}),
		).toThrow("at most one row");
		expect(() =>
			assistantAnalyticsResultSchema.parse({
				...result,
				rows: Array.from({ length: 101 }, (_, index) => ({
					label: String(index),
					value: index,
				})),
			}),
		).toThrow();
	});
});
