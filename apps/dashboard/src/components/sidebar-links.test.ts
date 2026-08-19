import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ICan } from "@/types/auth";
import {
	_role,
	getLinkModules,
	getSalesFinanceMigrationLinkModules,
	validateLinks,
	validateRules,
} from "./sidebar-links";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "app");
const permissions = (overrides: Partial<ICan> = {}) => overrides as ICan;
const inventoryValidationRoutes = [
	{
		href: "/inventory",
		page: "(sidebar)/inventory/page.tsx",
	},
	{
		href: "/inventory/variants",
		page: "(sidebar)/inventory/variants/page.tsx",
	},
	{
		href: "/inventory/allocations",
		page: "(sidebar)/inventory/allocations/page.tsx",
	},
	{
		href: "/inventory/inbounds",
		page: "(sidebar)/inventory/inbounds/page.tsx",
	},
	{
		href: "/inventory/production-plan",
		page: "(sidebar)/inventory/production-plan/page.tsx",
	},
	{
		href: "/inventory/backorders",
		page: "(sidebar)/inventory/backorders/page.tsx",
	},
	{
		href: "/inventory/partial-shipments",
		page: "(sidebar)/inventory/partial-shipments/page.tsx",
	},
	{
		href: "/inventory/stocks",
		page: "(sidebar)/inventory/stocks/page.tsx",
	},
	{
		href: "/inventory/dispatch-mode",
		page: "(sidebar)/inventory/dispatch-mode/page.tsx",
	},
	{
		href: "/p/sales-inventory-v2",
		page: "(public)/p/sales-inventory-v2/page.tsx",
		public: true,
	},
];

describe("sidebar role access", () => {
	test("matches roles without case, dash, or underscore sensitivity", () => {
		for (const role of [
			"Super Admin",
			"super admin",
			"SUPER ADMIN",
			"super-admin",
			"super_admin",
			"SuperAdmin",
		]) {
			expect(validateRules([_role.is("Super Admin")], {}, null, role)).toBe(
				true,
			);
		}
	});

	test("keeps non matching roles denied", () => {
		expect(validateRules([_role.is("Super Admin")], {}, null, "Admin")).toBe(
			false,
		);
		expect(validateRules([_role.is("Super Admin")], {}, null, "Sales")).toBe(
			false,
		);
	});

	test("allows admins with viewOrders to open the sales orders page by default", () => {
		const links = getLinkModules(
			validateLinks({
				role: { name: "Admin" },
				can: permissions({ viewOrders: true }),
				userId: "admin-1",
			}),
		);

		expect(links.linksNameMap["/sales-book/orders"]?.hasAccess).toBe(true);
	});

	test("routes delivery-only users to dispatch tasks instead of dispatch admin", () => {
		const links = getLinkModules(
			validateLinks({
				role: { name: "Dispatch" },
				can: permissions({ editDelivery: true }),
				userId: "dispatch-1",
			}),
		);
		const visibleDispatchLinks = links.modules
			.flatMap((module) => module.sections)
			.flatMap((section) => section.links)
			.filter((link) => link?.show && link.name === "Dispatch");

		expect(links.linksNameMap["/sales-book/dispatch-task"]?.hasAccess).toBe(
			true,
		);
		expect(links.linksNameMap["/sales-book/dispatch-admin"]?.hasAccess).toBe(
			false,
		);
		expect(visibleDispatchLinks.map((link) => link.href)).toEqual([
			"/sales-book/dispatch-task",
		]);
		expect(links.defaultLink).toBe("/sales-book/dispatch-task");
	});

	test("routes order editors to dispatch admin instead of dispatch tasks", () => {
		const links = getLinkModules(
			validateLinks({
				role: { name: "Admin" },
				can: permissions({ editOrders: true }),
				userId: "admin-1",
			}),
		);

		expect(links.linksNameMap["/sales-book/dispatch-task"]?.hasAccess).toBe(
			false,
		);
		expect(links.linksNameMap["/sales-book/dispatch-admin"]?.hasAccess).toBe(
			true,
		);
		expect(
			links.linksNameMap["/sales-book/dispatch-admin/v2"]?.hasAccess,
		).toBe(false);
	});

	test("shows Dispatch Admin v2 only to super admins with dispatch admin access", () => {
		const links = getLinkModules(
			validateLinks({
				role: { name: "Super Admin" },
				can: permissions({ editOrders: true }),
				userId: "super-admin-1",
			}),
		);

		expect(links.linksNameMap["/sales-book/dispatch-admin"]?.hasAccess).toBe(
			true,
		);
		expect(
			links.linksNameMap["/sales-book/dispatch-admin/v2"]?.hasAccess,
		).toBe(true);
	});

	test("keeps the dispatch admin page guard aligned with navigation", () => {
		const source = readFileSync(
			join(appRoot, "(sidebar)/(sales)/sales-book/dispatch-admin/page.tsx"),
			"utf8",
		);

		expect(source).toContain('rules={[_perm.is("editOrders")]}');
		expect(source).not.toContain(
			'rules={[_perm.some("editOrders", "editDelivery")]}',
		);

		const v2Source = readFileSync(
			join(
				appRoot,
				"(sidebar)/(sales)/sales-book/dispatch-admin/v2/page.tsx",
			),
			"utf8",
		);
		expect(v2Source).toContain(
			'rules={[_role.is("Super Admin"), _perm.is("editOrders")]}',
		);
	});

	test("marks the storefront workspace as work in progress", () => {
		const links = getLinkModules(
			validateLinks({
				role: { name: "Admin" },
				can: permissions({ viewStorefront: true }),
				userId: "admin-1",
			}),
		);
		const storefrontLink = links.modules
			.flatMap((module) => module.sections)
			.flatMap((section) => section.links)
			.find((link) => link?.href === "/storefront");

		expect(storefrontLink?.wip).toBe(true);
	});

	test("marks the new sales reporting surfaces for rollout discovery", () => {
		const links = getLinkModules(
			validateLinks({
				role: { name: "Admin" },
				can: permissions({ viewOrders: true, viewSales: true }),
				userId: "admin-1",
			}),
		);
		const salesLinks = links.modules
			.flatMap((module) => module.sections)
			.flatMap((section) => section.links);

		expect(
			salesLinks.find((link) => link?.href === "/sales-book/finance")?.badge,
		).toBe("New");
		expect(
			salesLinks.find((link) => link?.href === "/sales-book/reports")?.badge,
		).toBe("New");
	});

	test("moves legacy Accounting pages out of navigation while preserving direct route access", () => {
		const can = permissions({
			viewOrderPayment: true,
			editSalesResolution: true,
		});
		const migratedModules = getSalesFinanceMigrationLinkModules({ can });
		const visibleSalesLinks = migratedModules
			.flatMap((module) => module.sections)
			.flatMap((section) => section.links);
		const authorizedLinks = getLinkModules(
			validateLinks({
				role: { name: "Admin" },
				can,
				userId: "admin-1",
			}),
		);

		expect(
			visibleSalesLinks.find((link) => link?.href === "/sales-book/accounting"),
		).toBeUndefined();
		expect(
			visibleSalesLinks.find(
				(link) => link?.href === "/sales-book/accounting/resolution-center",
			),
		).toBeUndefined();
		expect(
			visibleSalesLinks.find((link) => link?.href === "/sales-book/finance"),
		).toBeDefined();
		expect(
			authorizedLinks.linksNameMap["/sales-book/accounting"]?.hasAccess,
		).toBe(true);
		expect(
			authorizedLinks.linksNameMap["/sales-book/accounting/resolution-center"]
				?.hasAccess,
		).toBe(true);
	});

	test("keeps create and edit order routes limited to editOrders", () => {
		const links = getLinkModules(
			validateLinks({
				role: { name: "Admin" },
				can: permissions({ viewOrders: true }),
				userId: "admin-1",
			}),
		);

		expect(links.linksNameMap["/sales-form/create-order"]?.hasAccess).toBe(
			false,
		);
		expect(links.linksNameMap["/sales-book/edit-order"]?.hasAccess).toBe(false);
	});

	test("uses the new sales form for canonical create links", () => {
		const links = getLinkModules(
			validateLinks({
				role: { name: "Admin" },
				can: permissions({ editOrders: true, viewOrders: true }),
				userId: "admin-1",
			}),
		);

		expect(links.linksNameMap["/sales-form/create-order"]?.hasAccess).toBe(
			true,
		);
		expect(links.linksNameMap["/sales-form/create-quote"]?.hasAccess).toBe(
			true,
		);
		expect(links.linksNameMap["/sales-book/create-order"]).toBeUndefined();
		expect(links.linksNameMap["/sales-book/create-quote"]?.hasAccess).toBe(
			false,
		);
	});

	test("shows contractor accounting to payment viewers or editors", () => {
		for (const can of [
			permissions({ viewJobPayment: true }),
			permissions({ editJobPayment: true }),
		]) {
			const links = getLinkModules(
				validateLinks({
					role: { name: "Admin" },
					can,
					userId: "admin-1",
				}),
			);
			expect(links.linksNameMap["/contractors/accounting"]?.hasAccess).toBe(
				true,
			);
		}
	});

	test("exposes inventory validation routes to super admins", () => {
		const links = getLinkModules(
			validateLinks({
				role: { name: "Super Admin" },
				can: permissions(),
				userId: "super-admin-1",
			}),
		);

		for (const { href, public: isPublic } of inventoryValidationRoutes) {
			if (isPublic) continue;
			expect(links.linksNameMap[href]?.hasAccess).toBe(true);
		}
	});

	test("exposes bug report access settings to super admins only", () => {
		const superAdminLinks = getLinkModules(
			validateLinks({
				role: { name: "Super Admin" },
				can: permissions(),
				userId: "super-admin-1",
			}),
		);
		const adminLinks = getLinkModules(
			validateLinks({
				role: { name: "Admin" },
				can: permissions(),
				userId: "admin-1",
			}),
		);

		expect(
			superAdminLinks.linksNameMap["/settings/bug-reports"]?.hasAccess,
		).toBe(true);
		expect(adminLinks.linksNameMap["/settings/bug-reports"]?.hasAccess).toBe(
			false,
		);
		expect(
			existsSync(join(appRoot, "(sidebar)/settings/bug-reports/page.tsx")),
		).toBe(true);
	});

	test("exposes sales settings to super admins only", () => {
		const superAdminLinks = getLinkModules(
			validateLinks({
				role: { name: "Super Admin" },
				can: permissions(),
				userId: "super-admin-1",
			}),
		);
		const adminLinks = getLinkModules(
			validateLinks({
				role: { name: "Admin" },
				can: permissions(),
				userId: "admin-1",
			}),
		);

		expect(superAdminLinks.linksNameMap["/settings/sales"]?.hasAccess).toBe(
			true,
		);
		expect(adminLinks.linksNameMap["/settings/sales"]?.hasAccess).toBe(false);
		expect(existsSync(join(appRoot, "(sidebar)/settings/sales/page.tsx"))).toBe(
			true,
		);
	});

	test("exposes sales form adoption to super admins only", () => {
		const superAdminLinks = getLinkModules(
			validateLinks({
				role: { name: "Super Admin" },
				can: permissions(),
				userId: "super-admin-1",
			}),
		);
		const adminLinks = getLinkModules(
			validateLinks({
				role: { name: "Admin" },
				can: permissions(),
				userId: "admin-1",
			}),
		);

		expect(
			superAdminLinks.linksNameMap["/settings/sales-form-adoption"]?.hasAccess,
		).toBe(true);
		expect(
			adminLinks.linksNameMap["/settings/sales-form-adoption"]?.hasAccess,
		).toBe(false);
		expect(
			existsSync(
				join(appRoot, "(sidebar)/settings/sales-form-adoption/page.tsx"),
			),
		).toBe(true);
	});

	test("keeps inventory validation route files in place", () => {
		for (const route of inventoryValidationRoutes) {
			expect(existsSync(join(appRoot, route.page))).toBe(true);
		}
	});
});
