import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { getLinkModules, _role, validateLinks, validateRules } from "./sidebar-links";

const appRoot = join(import.meta.dir, "..", "app");
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
            expect(
                validateRules([_role.is("Super Admin")], {}, null, role),
            ).toBe(true);
        }
    });

    test("keeps non matching roles denied", () => {
        expect(
            validateRules([_role.is("Super Admin")], {}, null, "Admin"),
        ).toBe(false);
        expect(
            validateRules([_role.is("Super Admin")], {}, null, "Sales"),
        ).toBe(false);
    });

    test("allows admins with viewOrders to open the sales orders v2 page by default", () => {
        const links = getLinkModules(
            validateLinks({
                role: { name: "Admin" },
                can: { viewOrders: true } as any,
                userId: "admin-1",
            }),
        );

        expect(links.linksNameMap["/sales-book/orders/v2"]?.hasAccess).toBe(
            true,
        );
        expect(links.linksNameMap["/sales-book/orders"]?.hasAccess).toBe(true);
    });

    test("keeps create and edit order routes limited to editOrders", () => {
        const links = getLinkModules(
            validateLinks({
                role: { name: "Admin" },
                can: { viewOrders: true } as any,
                userId: "admin-1",
            }),
        );

        expect(links.linksNameMap["/sales-book/create-order"]?.hasAccess).toBe(
            false,
        );
        expect(links.linksNameMap["/sales-book/edit-order"]?.hasAccess).toBe(
            false,
        );
    });

    test("exposes inventory validation routes to super admins", () => {
        const links = getLinkModules(
            validateLinks({
                role: { name: "Super Admin" },
                can: {} as any,
                userId: "super-admin-1",
            }),
        );

        for (const { href, public: isPublic } of inventoryValidationRoutes) {
            if (isPublic) continue;
            expect(links.linksNameMap[href]?.hasAccess).toBe(true);
        }
    });

    test("keeps inventory validation route files in place", () => {
        for (const route of inventoryValidationRoutes) {
            expect(existsSync(join(appRoot, route.page))).toBe(true);
        }
    });
});
