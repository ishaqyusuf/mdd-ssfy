import { describe, expect, test } from "bun:test";
import { ASSISTANT_ANALYTICS_CATALOG_VERSION } from "./analytics-contract";
import {
	compileAssistantAnalyticsQueryPlan,
	executeAssistantAnalyticsQueryPlan,
} from "./analytics-query-plan";

const base = {
	catalogVersion: ASSISTANT_ANALYTICS_CATALOG_VERSION,
	domain: "sales",
	metric: "sales.revenueByPeriod",
	dateRange: { from: "2026-08-01", to: "2026-08-31" },
	filters: [{ field: "customerId", operator: "eq", value: 88 }],
	groupBy: "day",
};

const authority = {
	grants: {
		viewOrders: true,
		viewOrderPayment: true,
		viewProduction: true,
		viewInventory: true,
		viewCommunity: true,
	},
	salesOrderIds: [9, 2, 9],
	projectIds: [41],
	timezone: "America/New_York",
};

describe("assistant analytics query plan", () => {
	test("compiles a reviewed query with scope and all values parameterized", () => {
		const plan = compileAssistantAnalyticsQueryPlan(base, authority);
		expect(plan.statementId).toBe("sales-revenue-v1");
		expect(plan.text).toContain("so.id IN (?, ?)");
		expect(plan.text).not.toContain("America/New_York");
		expect(plan.text).not.toContain("88");
		expect(plan.text).toContain("so.type = 'order'");
		expect(plan.values).toEqual([
			"America/New_York",
			2,
			9,
			"2026-08-01 00:00:00",
			"America/New_York",
			"2026-08-31 23:59:59",
			"America/New_York",
			88,
			25,
		]);
		expect(plan.metadata).toMatchObject({
			scopeCount: 2,
			scopeKind: "sales-order-ids",
		});
		expect(plan.bounds).toMatchObject({
			maxQueryCount: 2,
			maxRows: 5000,
			timeoutMs: 8000,
		});
		expect(plan.result).toMatchObject({
			groupBy: "day",
			limit: 25,
			sort: { field: "label", direction: "asc" },
		});
	});

	test("binds production scope in both the join and aggregate predicate", () => {
		const plan = compileAssistantAnalyticsQueryPlan(
			{
				...base,
				domain: "production",
				metric: "production.throughputByPeriod",
				filters: [],
				groupBy: "month",
			},
			authority,
		);
		expect(plan.text.match(/so\.id IN \(\?, \?\)/g)).toHaveLength(2);
		expect(plan.values.filter((value) => value === 2)).toHaveLength(2);
		expect(plan.values.filter((value) => value === 9)).toHaveLength(2);
		expect(plan.text).toContain("review.status = 'APPROVED'");
		expect(plan.text).toContain("so.archivedAt IS NULL");
		expect(plan.text).toContain("so.id = soi.salesOrderId");
		expect(plan.text).not.toContain("so.id = ops.salesOrderId");
	});

	test("compiles projection-backed metrics for their canonical adapter", () => {
		const plan = compileAssistantAnalyticsQueryPlan(
			{
				...base,
				metric: "sales.orderCountByStatus",
				filters: [],
				groupBy: "status",
			},
			authority,
		);
		expect(plan.postProcessor).toBe("sales-pipeline-status");
		expect(plan.bounds.maxQueryCount).toBe(7);
		expect(plan.text).toContain("so.id IN (?, ?)");
		expect(plan.text).toContain("so.type = 'order'");
	});

	test("keeps project scope inside the child aggregate join", () => {
		const plan = compileAssistantAnalyticsQueryPlan(
			{
				...base,
				domain: "community",
				metric: "community.progressByProject",
				filters: [],
				groupBy: "projectId",
			},
			authority,
		);
		expect(plan.text.match(/p\.id IN \(\?\)/g)).toHaveLength(2);
		expect(plan.values.filter((value) => value === 41)).toHaveLength(2);
		expect(plan.text).toContain("GROUP BY projectId");
	});

	test("compiles every supported non-calendar grouping exactly", () => {
		const revenue = compileAssistantAnalyticsQueryPlan(
			{ ...base, filters: [], groupBy: "salesRepId" },
			authority,
		);
		expect(revenue.text).toContain("CAST(so.salesRepId AS CHAR) AS label");
		const production = compileAssistantAnalyticsQueryPlan(
			{
				...base,
				domain: "production",
				metric: "production.throughputByPeriod",
				filters: [],
				groupBy: "salesRepId",
			},
			authority,
		);
		expect(production.text).toContain("CAST(so.salesRepId AS CHAR) AS label");
		const community = compileAssistantAnalyticsQueryPlan(
			{
				...base,
				domain: "community",
				metric: "community.progressByProject",
				filters: [],
				groupBy: "status",
			},
			authority,
		);
		expect(community.text).toContain("h.status AS status");
		expect(community.text).toContain("GROUP BY status");
	});

	test("rejects absent grants, empty scope, invalid timezone, and excessive cost", () => {
		expect(() =>
			compileAssistantAnalyticsQueryPlan(base, { ...authority, grants: {} }),
		).toThrow("Missing required");
		expect(() =>
			compileAssistantAnalyticsQueryPlan(base, {
				...authority,
				grants: { viewOrders: true },
			}),
		).toThrow("viewOrderPayment");
		expect(() =>
			compileAssistantAnalyticsQueryPlan(base, {
				...authority,
				salesOrderIds: [],
			}),
		).toThrow("scope is empty");
		expect(() =>
			compileAssistantAnalyticsQueryPlan(base, {
				...authority,
				timezone: "not/a timezone",
			}),
		).toThrow("Invalid analytics actor timezone");
		expect(() =>
			compileAssistantAnalyticsQueryPlan(
				{ ...base, dateRange: { from: "2025-09-01", to: "2026-08-31" } },
				{
					...authority,
					salesOrderIds: Array.from({ length: 2000 }, (_, index) => index + 1),
				},
			),
		).toThrow("query cost");
		expect(() =>
			compileAssistantAnalyticsQueryPlan(
				{ ...base, cursor: "opaque" },
				authority,
			),
		).toThrow("keyset pagination");
	});

	test("converts explicit date filters from the actor timezone", () => {
		const plan = compileAssistantAnalyticsQueryPlan(
			{
				...base,
				filters: [{ field: "createdAt", operator: "gte", value: "2026-08-05" }],
			},
			authority,
		);
		expect(plan.text).toContain("so.createdAt >= CONVERT_TZ(?, ?, 'UTC')");
		expect(plan.values).toContain("2026-08-05 00:00:00");
	});

	test("binds one value for every placeholder across executable metric shapes", () => {
		const cases = [
			base,
			{ ...base, filters: [], groupBy: "salesRepId" },
			{
				...base,
				domain: "production",
				metric: "production.throughputByPeriod",
				filters: [{ field: "salesRepId", operator: "in", value: [7, 8] }],
				groupBy: "week",
			},
			{
				...base,
				domain: "community",
				metric: "community.progressByProject",
				filters: [{ field: "status", operator: "eq", value: "installed" }],
				groupBy: "status",
			},
		] as const;
		for (const input of cases) {
			const plan = compileAssistantAnalyticsQueryPlan(input, authority);
			expect(plan.text.match(/\?/g)?.length ?? 0).toBe(plan.values.length);
		}
	});

	test("enforces result row and byte limits", async () => {
		const plan = compileAssistantAnalyticsQueryPlan(base, authority);
		const result = await executeAssistantAnalyticsQueryPlan(plan, async () => [
			{ label: "2026-08-01", value: 12 },
		]);
		expect(result).toMatchObject({ rowCount: 1, queryCount: 1 });
		await expect(
			executeAssistantAnalyticsQueryPlan(
				{ ...plan, bounds: { ...plan.bounds, maxRows: 0 } },
				async () => [{}],
			),
		).rejects.toThrow("row limit");
		await expect(
			executeAssistantAnalyticsQueryPlan(
				{ ...plan, bounds: { ...plan.bounds, maxBytes: 1 } },
				async () => [{ value: 1 }],
			),
		).rejects.toThrow("byte limit");
	});

	test("accounts for scope-resolution queries in the execution budget", async () => {
		const plan = compileAssistantAnalyticsQueryPlan(base, authority);
		const result = await executeAssistantAnalyticsQueryPlan(
			plan,
			async () => [{ label: "2026-08-01", value: 12 }],
			{ initialQueryCount: 1 },
		);
		expect(result.queryCount).toBe(2);
		await expect(
			executeAssistantAnalyticsQueryPlan(
				{ ...plan, bounds: { ...plan.bounds, maxQueryCount: 1 } },
				async () => [],
				{ initialQueryCount: 1 },
			),
		).rejects.toThrow("query count limit");
	});

	test("propagates cancellation to the query runner", async () => {
		const plan = compileAssistantAnalyticsQueryPlan(base, authority);
		const controller = new AbortController();
		const pending = executeAssistantAnalyticsQueryPlan(
			plan,
			({ signal }) =>
				new Promise((resolve) =>
					signal.addEventListener("abort", () => resolve([]), { once: true }),
				),
			{ signal: controller.signal },
		);
		controller.abort();
		await expect(pending).rejects.toThrow("cancelled");
	});

	test("times out even when the query runner ignores the abort signal", async () => {
		const plan = compileAssistantAnalyticsQueryPlan(base, authority);
		await expect(
			executeAssistantAnalyticsQueryPlan(
				{ ...plan, bounds: { ...plan.bounds, timeoutMs: 5 } },
				() => new Promise(() => undefined),
			),
		).rejects.toThrow("timed out");
	});

	test("measures database bigint rows without throwing", async () => {
		const plan = compileAssistantAnalyticsQueryPlan(base, authority);
		const result = await executeAssistantAnalyticsQueryPlan(plan, async () => [
			{ value: 12n },
		]);
		expect(result.bytes).toBeGreaterThan(0);
	});

	test("rejects invalid accounting from a custom canonical adapter", async () => {
		const plan = compileAssistantAnalyticsQueryPlan(
			{
				...base,
				metric: "sales.orderCountByStatus",
				filters: [],
				groupBy: "status",
			},
			authority,
		);
		for (const queryCount of [Number.NaN, -1, 0, 1.5]) {
			await expect(
				executeAssistantAnalyticsQueryPlan(
					plan,
					async () => [{ id: 1, type: "order", salesRepId: 7 }],
					{
						canonicalAdapter: async () => ({ rows: [], queryCount }),
					},
				),
			).rejects.toThrow("query count is invalid");
		}
	});
});
