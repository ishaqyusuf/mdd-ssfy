import { describe, expect, test } from "bun:test";

import { _role, validateRules } from "./sidebar-links";

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
});
