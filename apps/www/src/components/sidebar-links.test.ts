import { describe, expect, test } from "bun:test";

import { getLinkModules, _role, validateLinks, validateRules } from "./sidebar-links";

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
});
