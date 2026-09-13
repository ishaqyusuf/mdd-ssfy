import { describe, expect, mock, test } from "bun:test";

import { runAssistantAnalytics } from "./analytics-service";
import { executeRegisteredAssistantTool } from "./registry";

const intent = {
	catalogVersion: "assistant-analytics-catalog-v1",
	domain: "sales",
	metric: "sales.revenueByPeriod",
	dateRange: { from: "2026-09-01", to: "2026-09-30" },
	filters: [],
	groupBy: "month",
	presentation: "area",
	sort: { field: "label", direction: "asc" },
	limit: 12,
} as const;

const actor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	timezone: "America/New_York",
	grants: { viewOrders: true, viewOrderPayment: true },
};

describe("assistant analytics service", () => {
	test("publishes the analytics service through the versioned registry envelope", async () => {
		const data = {
			version: "assistant-analytics-result-v1",
			metric: "sales.revenueByPeriod",
			title: "Sales revenue by period",
			definition:
				"Current non-deleted order totals grouped by the actor's calendar period; currencies remain separate.",
			presentation: "area",
			rows: [],
			dateRange: { ...intent.dateRange, timezone: actor.timezone },
			unit: "currency",
			currency: "USD",
			freshness: {
				observedAt: "2026-09-13T12:00:00.000Z",
				label: "Live",
			},
			sources: [{ id: "SalesOrders@sales-orders-v1", label: "SalesOrders" }],
		} as const;
		const result = await executeRegisteredAssistantTool(
			actor,
			{ toolId: "analytics_query", version: 1, input: intent },
			{ runAnalytics: mock(async () => data) },
		);
		expect(result).toMatchObject({ status: "success", data });
	});

	test("resolves actor scope before executing a parameterized reviewed plan", async () => {
		const raw = mock(async () => [
			{ label: "2026-09", currency: "USD", value: "42500" },
		]);
		const db = {
			salesOrders: {
				findMany: mock(async () => [{ id: 11 }, { id: 12 }]),
			},
			projects: { findMany: mock(async () => []) },
			$queryRawUnsafe: raw,
		};

		const result = await runAssistantAnalytics(
			db as never,
			actor,
			intent,
			new AbortController().signal,
		);

		expect(result.rows).toEqual([
			{
				label: "2026-09",
				secondaryLabel: "USD",
				value: 42500,
				drilldown: {
					label: "View orders",
					href: "/sales-book/orders?dateRange=2026-09-01%2C2026-09-30",
				},
			},
		]);
		expect(result.dateRange.timezone).toBe("America/New_York");
		expect(db.salesOrders.findMany.mock.calls[0]?.[0]).toMatchObject({
			where: {
				orgId: 7,
				createdAt: {
					gte: new Date("2026-08-31T00:00:00.000Z"),
					lte: new Date("2026-10-01T23:59:59.999Z"),
				},
			},
			take: 2001,
		});
		expect(
			await runAssistantAnalytics(
				db as never,
				actor,
				{ ...intent, presentation: "auto" },
				new AbortController().signal,
			),
		).toMatchObject({ presentation: "area" });
		expect(raw).toHaveBeenCalledTimes(2);
		const [statement, ...values] = raw.mock.calls[0] ?? [];
		expect(statement).toContain("so.id IN (?, ?)");
		expect(values).toContain(11);
		expect(values).toContain(12);
		expect(String(statement)).not.toContain("42500");
	});

	test("checks metric grants before touching scoped business data", async () => {
		const findMany = mock(async () => [{ id: 11 }]);
		const db = {
			salesOrders: { findMany },
			projects: { findMany: mock(async () => []) },
			$queryRawUnsafe: mock(async () => []),
		};
		await expect(
			runAssistantAnalytics(
				db as never,
				{ ...actor, grants: { viewOrders: true } },
				intent,
				new AbortController().signal,
			),
		).rejects.toThrow("viewOrderPayment");
		expect(findMany).not.toHaveBeenCalled();
	});

	test("returns a typed empty result without producing invalid IN syntax", async () => {
		const raw = mock(async () => []);
		const result = await runAssistantAnalytics(
			{
				salesOrders: { findMany: mock(async () => []) },
				projects: { findMany: mock(async () => []) },
				$queryRawUnsafe: raw,
			} as never,
			actor,
			intent,
			new AbortController().signal,
		);
		expect(result.rows).toEqual([]);
		expect(raw).not.toHaveBeenCalled();
	});

	test("includes production submissions linked through their order item", async () => {
		const findMany = mock()
			.mockResolvedValueOnce([{ id: 21 }])
			.mockResolvedValueOnce([{ id: 21 }]);
		const raw = mock(async () => [{ label: "2026-09", value: 4 }]);
		const productionIntent = {
			...intent,
			domain: "production",
			metric: "production.throughputByPeriod",
		} as const;
		const result = await runAssistantAnalytics(
			{
				salesOrders: { findMany },
				projects: { findMany: mock(async () => []) },
				$queryRawUnsafe: raw,
			} as never,
			{
				...actor,
				grants: { viewProduction: true, editProduction: true },
			},
			productionIntent,
			new AbortController().signal,
		);

		expect(result.rows[0]?.value).toBe(4);
		expect(findMany.mock.calls[0]?.[0]).toMatchObject({
			where: {
				items: {
					some: {
						deletedAt: null,
						productions: { some: { deletedAt: null } },
					},
				},
			},
		});
	});

	test("applies cancellation and the hard deadline to scope resolution", async () => {
		let resolveScope: (rows: { id: number }[]) => void = () => undefined;
		const slowScope = new Promise<{ id: number }[]>((resolve) => {
			resolveScope = resolve;
		});
		const findMany = mock(async () => slowScope);
		const db = {
			salesOrders: { findMany },
			projects: { findMany: mock(async () => []) },
			$queryRawUnsafe: mock(async () => []),
		};
		await expect(
			runAssistantAnalytics(
				db as never,
				actor,
				intent,
				new AbortController().signal,
				5,
			),
		).rejects.toThrow("cancelled or timed out");
		resolveScope([{ id: 11 }]);
		await Promise.resolve();
		await Promise.resolve();
		expect(findMany).toHaveBeenCalledTimes(1);

		const never = new Promise<never>(() => undefined);
		const controller = new AbortController();
		const cancelled = runAssistantAnalytics(
			{
				salesOrders: { findMany: mock(async () => never) },
				projects: { findMany: mock(async () => []) },
				$queryRawUnsafe: mock(async () => []),
			} as never,
			actor,
			intent,
			controller.signal,
		);
		controller.abort();
		await expect(cancelled).rejects.toThrow("cancelled or timed out");
	});
});
