import { describe, expect, it } from "bun:test";
import type { AppRouter } from "@gnd/api/trpc/routers/_app";
import { QueryClient, createTRPCOptionsProxy } from "@gnd/ui/tanstack";
import {
	createTypedQueryInvalidation,
	executeQueryEvent,
	invalidateQueryTargets,
} from "./executor";
import { pathTarget, queryTarget } from "./types";

function procedure(path: string) {
	return {
		infiniteQueryKey: (input?: unknown) => [
			[path],
			{ input, type: "infinite" },
		],
		pathKey: () => [[path]],
		queryKey: (input?: unknown) => [[path], { input, type: "query" }],
	};
}

function createTRPCProxy() {
	return {
		customers: {
			customerInfoSearch: procedure("customers.customerInfoSearch"),
			getCustomerDirectoryV2Summary: procedure(
				"customers.getCustomerDirectoryV2Summary",
			),
			getCustomerOverviewV2: procedure("customers.getCustomerOverviewV2"),
			getSalesCustomer: procedure("customers.getSalesCustomer"),
			searchCustomers: procedure("customers.searchCustomers"),
		},
		filters: {
			customer: procedure("filters.customer"),
			salesOrders: procedure("filters.salesOrders"),
			salesQuotes: procedure("filters.salesQuotes"),
		},
		newSalesForm: {
			resolveCustomer: procedure("newSalesForm.resolveCustomer"),
			searchCustomers: procedure("newSalesForm.searchCustomers"),
		},
		pageTabs: {
			defaults: procedure("pageTabs.defaults"),
			list: procedure("pageTabs.list"),
		},
		sales: {
			accountingIndex: procedure("sales.accountingIndex"),
			customersIndex: procedure("sales.customersIndex"),
			getOrders: procedure("sales.getOrders"),
			getOrdersSummary: procedure("sales.getOrdersSummary"),
			getSalesAccountings: procedure("sales.getSalesAccountings"),
			getSaleTransactions: procedure("sales.getSaleTransactions"),
			getSaleOverview: procedure("sales.getSaleOverview"),
			mobileDashboardOverview: procedure("sales.mobileDashboardOverview"),
			productionOverview: procedure("sales.productionOverview"),
		},
		salesDashboard: {
			getKpis: procedure("salesDashboard.getKpis"),
			getRecentSales: procedure("salesDashboard.getRecentSales"),
			getRevenueOverTime: procedure("salesDashboard.getRevenueOverTime"),
			getSalesRepLeaderboard: procedure(
				"salesDashboard.getSalesRepLeaderboard",
			),
			getTopProducts: procedure("salesDashboard.getTopProducts"),
		},
	};
}

function createQueryClientSpy() {
	const invalidated: (readonly unknown[])[] = [];
	const queryClient = {
		invalidateQueries: ({ queryKey }: { queryKey: readonly unknown[] }) => {
			invalidated.push(queryKey);
			return Promise.resolve();
		},
	} as unknown as QueryClient;

	return {
		invalidated,
		queryClient,
	};
}

describe("query event executor", () => {
	it("resolves query paths from the real tRPC options proxy", async () => {
		const { invalidated, queryClient } = createQueryClientSpy();
		const trpc = createTRPCOptionsProxy<AppRouter>({
			client: {} as never,
			queryClient: new QueryClient(),
		});

		const results = await executeQueryEvent({
			event: { name: "customer.changed" },
			queryClient,
			trpc,
		});

		expect(results.every((result) => result.status === "fulfilled")).toBe(true);
		expect(invalidated).toContainEqual([["customers", "getSalesCustomer"]]);
		expect(invalidated).toContainEqual([["sales", "getSaleOverview"]]);
	});

	it("deduplicates identical query targets before invalidating", async () => {
		const { invalidated, queryClient } = createQueryClientSpy();
		const trpc = createTRPCProxy();

		await invalidateQueryTargets({
			queryClient,
			targets: [
				pathTarget("sales.getOrders"),
				pathTarget("sales.getOrders"),
				queryTarget("sales.getOrders", { page: 1 } as never),
			],
			trpc,
		});

		expect(invalidated.length).toBe(2);
		expect(invalidated[0]).toEqual([["sales.getOrders"]]);
	});

	it("executes all targets declared by a domain event", async () => {
		const { invalidated, queryClient } = createQueryClientSpy();

		const results = await executeQueryEvent({
			event: { name: "sales.order.changed" },
			queryClient,
			trpc: createTRPCProxy(),
		});

		expect(results.every((result) => result.status === "fulfilled")).toBe(true);
		expect(invalidated.length > 5).toBe(true);
		expect(
			invalidated.some(
				(queryKey) =>
					JSON.stringify(queryKey) === JSON.stringify([["sales.getOrders"]]),
			),
		).toBe(true);
		expect(
			invalidated.some(
				(queryKey) =>
					JSON.stringify(queryKey) === JSON.stringify([["pageTabs.list"]]),
			),
		).toBe(true);
	});

	it("refreshes customer and sales projections after a customer edit", async () => {
		const { invalidated, queryClient } = createQueryClientSpy();

		const results = await executeQueryEvent({
			event: { name: "customer.changed" },
			queryClient,
			trpc: createTRPCProxy(),
		});

		expect(results.every((result) => result.status === "fulfilled")).toBe(true);
		const serialized = invalidated.map((queryKey) => JSON.stringify(queryKey));
		for (const route of [
			"customers.getSalesCustomer",
			"customers.getCustomerOverviewV2",
			"sales.customersIndex",
			"newSalesForm.resolveCustomer",
			"sales.getSaleOverview",
		]) {
			expect(serialized.includes(JSON.stringify([[route]]))).toBe(true);
		}
	});

	it("refreshes sales orders and page tabs after a payment review", async () => {
		const { invalidated, queryClient } = createQueryClientSpy();

		const results = await executeQueryEvent({
			event: { name: "sales.payment.changed" },
			queryClient,
			trpc: createTRPCProxy(),
		});

		expect(results.every((result) => result.status === "fulfilled")).toBe(true);
		for (const route of [
			"sales.getOrders",
			"sales.getOrdersSummary",
			"pageTabs.list",
		]) {
			expect(
				invalidated.some(
					(queryKey) => JSON.stringify(queryKey) === JSON.stringify([[route]]),
				),
			).toBe(true);
		}
	});

	it("invalidates only the selected sale overview when event scope is known", async () => {
		const { invalidated, queryClient } = createQueryClientSpy();

		await executeQueryEvent({
			event: {
				name: "sales.payment.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
					],
				},
			},
			queryClient,
			trpc: createTRPCProxy(),
		});

		const serialized = invalidated.map((queryKey) => JSON.stringify(queryKey));
		expect(serialized.includes(JSON.stringify([["sales.getOrders"]]))).toBe(
			true,
		);
		expect(serialized.includes(JSON.stringify([["pageTabs.list"]]))).toBe(true);
		expect(
			serialized.includes(
				JSON.stringify([
					["sales.getSaleOverview"],
					{
						input: {
							orderNo: "08894LM",
							salesType: "order",
						},
						type: "query",
					},
				]),
			),
		).toBe(true);
		expect(
			serialized.includes(JSON.stringify([["sales.getSaleOverview"]])),
		).toBe(false);
		expect(
			serialized.includes(
				JSON.stringify([
					["sales.getSaleOverview"],
					{
						input: {
							orderNo: "unrelated-sale",
							salesType: "order",
						},
						type: "query",
					},
				]),
			),
		).toBe(false);
	});

	it("falls back to all sale overviews when event scope is unavailable", async () => {
		const { invalidated, queryClient } = createQueryClientSpy();

		await executeQueryEvent({
			event: { name: "sales.payment.changed" },
			queryClient,
			trpc: createTRPCProxy(),
		});

		expect(
			invalidated.some(
				(queryKey) =>
					JSON.stringify(queryKey) ===
					JSON.stringify([["sales.getSaleOverview"]]),
			),
		).toBe(true);
	});

	it("provides typed path-level invalidation for one-off callers", async () => {
		const { invalidated, queryClient } = createQueryClientSpy();
		const invalidate = createTypedQueryInvalidation({
			queryClient,
			trpc: createTRPCProxy(),
		});

		await invalidate.path("sales.productionOverview");

		expect(invalidated).toEqual([[["sales.productionOverview"]]]);
	});
});
