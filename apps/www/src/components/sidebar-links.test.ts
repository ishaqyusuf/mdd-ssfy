import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ICan } from "@/types/auth";
import {
	_role,
	getLinkModules,
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

	test("keeps create and edit order routes limited to editOrders", () => {
		const links = getLinkModules(
			validateLinks({
				role: { name: "Admin" },
				can: permissions({ viewOrders: true }),
				userId: "admin-1",
			}),
		);

		expect(links.linksNameMap["/sales-book/create-order"]?.hasAccess).toBe(
			false,
		);
		expect(links.linksNameMap["/sales-book/edit-order"]?.hasAccess).toBe(false);
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

	test("keeps inventory validation route files in place", () => {
		for (const route of inventoryValidationRoutes) {
			expect(existsSync(join(appRoot, route.page))).toBe(true);
		}
	});
});
