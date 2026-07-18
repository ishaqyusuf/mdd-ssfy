import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	PAGE_TAB_PATHS,
	createPageTabsInvalidation,
	invalidatePageTabs,
	invalidatePageTabsForPathKeys,
	invalidatePageTabsForPaths,
	normalizePageTabPaths,
	resolvePageTabPath,
} from "./invalidation";

function createInvalidateContext() {
	const invalidated: (readonly unknown[])[] = [];
	const queryClient = {
		invalidateQueries: async ({
			queryKey,
		}: { queryKey: readonly unknown[] }) => {
			invalidated.push(queryKey);
		},
	};
	const trpc = {
		pageTabs: {
			list: {
				queryKey: (input: { page: string; includeInactive?: boolean }) => [
					"pageTabs",
					"list",
					input,
				],
			},
			defaults: {
				queryKey: () => ["pageTabs", "defaults"],
			},
		},
	};

	return { invalidated, queryClient, trpc };
}

describe("page tab invalidation", () => {
	it("resolves typed path keys", () => {
		expect(resolvePageTabPath("orders")).toBe("/sales-book/orders");
		expect(resolvePageTabPath("quotes")).toBe("/sales-book/quotes");
		expect(resolvePageTabPath("projects")).toBe("/community/projects");
		expect(resolvePageTabPath("units")).toBe("/community/project-units");
		expect(resolvePageTabPath("unitInvoices")).toBe("/community/unit-invoices");
		expect(resolvePageTabPath("customerServices")).toBe(
			"/community/customer-services",
		);
	});

	it("covers every page in the page-tab rollout registry", () => {
		expect(PAGE_TAB_PATHS).toEqual({
			orders: "/sales-book/orders",
			quotes: "/sales-book/quotes",
			customers: "/sales-book/customers",
			dealers: "/sales-book/dealers",
			employees: "/hrm/employees",
			jobs: "/hrm/contractors/jobs",
			projects: "/community/projects",
			units: "/community/project-units",
			unitInvoices: "/community/unit-invoices",
			templates: "/community/templates",
			customerServices: "/community/customer-services",
			communityProductions: "/community/unit-productions",
		});
	});

	it("keeps every typed page registered with a server count adapter", () => {
		const currentDir = dirname(fileURLToPath(import.meta.url));
		const routerSource = readFileSync(
			resolve(
				currentDir,
				"../../../../api/src/trpc/routers/page-tabs.route.ts",
			),
			"utf8",
		);
		const missing = Object.values(PAGE_TAB_PATHS).filter(
			(path) => !routerSource.includes(`case "${path}":`),
		);

		expect(missing).toEqual([]);
	});

	it("normalizes and dedupes page paths", () => {
		expect(
			normalizePageTabPaths([
				"/sales-book/orders?paymentReview=needs_review",
				"/sales-book/orders#saved-tabs",
				"/sales-book/orders/",
				"https://gndprodesk.localhost:3011/sales-book/orders?sort=createdAt.desc",
				"",
				"   ",
				"community/unit-invoices",
				"/community/unit-invoices?sort=createdAt.desc",
			]),
		).toEqual(["/sales-book/orders", "/community/unit-invoices"]);
	});

	it("invalidates visible tabs, manage tabs, and defaults for raw paths", async () => {
		const { invalidated, queryClient, trpc } = createInvalidateContext();

		await invalidatePageTabs(
			queryClient,
			trpc,
			"/sales-book/orders?paymentReview=needs_review",
		);

		expect(invalidated).toEqual([
			["pageTabs", "list", { page: "/sales-book/orders" }],
			[
				"pageTabs",
				"list",
				{ page: "/sales-book/orders", includeInactive: true },
			],
			["pageTabs", "defaults"],
		]);
	});

	it("does not invalidate anything when raw paths are empty", async () => {
		const { invalidated, queryClient, trpc } = createInvalidateContext();

		await invalidatePageTabsForPaths(queryClient, trpc, "", "   ");

		expect(invalidated).toEqual([]);
	});

	it("invalidates multiple typed pages once per normalized page", async () => {
		const { invalidated, queryClient, trpc } = createInvalidateContext();

		await invalidatePageTabsForPathKeys(
			queryClient,
			trpc,
			"orders",
			"quotes",
			"orders",
		);

		expect(invalidated).toEqual([
			["pageTabs", "list", { page: "/sales-book/orders" }],
			[
				"pageTabs",
				"list",
				{ page: "/sales-book/orders", includeInactive: true },
			],
			["pageTabs", "list", { page: "/sales-book/quotes" }],
			[
				"pageTabs",
				"list",
				{ page: "/sales-book/quotes", includeInactive: true },
			],
			["pageTabs", "defaults"],
		]);
	});

	it("defaults no-arg hook-style invalidation to the current pathname", async () => {
		const { invalidated, queryClient, trpc } = createInvalidateContext();
		const pageTabs = createPageTabsInvalidation({
			queryClient,
			trpc,
			currentPath: "/sales-book/orders?sort=createdAt.desc",
		});

		await pageTabs.invalidate();

		expect(invalidated).toEqual([
			["pageTabs", "list", { page: "/sales-book/orders" }],
			[
				"pageTabs",
				"list",
				{ page: "/sales-book/orders", includeInactive: true },
			],
			["pageTabs", "defaults"],
		]);
	});

	it("supports hook-style typed key invalidation with deduping", async () => {
		const { invalidated, queryClient, trpc } = createInvalidateContext();
		const pageTabs = createPageTabsInvalidation({
			queryClient,
			trpc,
			currentPath: "/sales-book/customers",
		});

		await pageTabs.invalidate("orders", "unitInvoices", "orders");

		expect(invalidated).toEqual([
			["pageTabs", "list", { page: "/sales-book/orders" }],
			[
				"pageTabs",
				"list",
				{ page: "/sales-book/orders", includeInactive: true },
			],
			["pageTabs", "list", { page: "/community/unit-invoices" }],
			[
				"pageTabs",
				"list",
				{ page: "/community/unit-invoices", includeInactive: true },
			],
			["pageTabs", "defaults"],
		]);
	});

	it("defaults no-arg raw path invalidation to the current pathname", async () => {
		const { invalidated, queryClient, trpc } = createInvalidateContext();
		const pageTabs = createPageTabsInvalidation({
			queryClient,
			trpc,
			currentPath: "/community/unit-invoices?sort=createdAt.desc",
		});

		await pageTabs.invalidatePath();

		expect(invalidated).toEqual([
			["pageTabs", "list", { page: "/community/unit-invoices" }],
			[
				"pageTabs",
				"list",
				{ page: "/community/unit-invoices", includeInactive: true },
			],
			["pageTabs", "defaults"],
		]);
	});
});
