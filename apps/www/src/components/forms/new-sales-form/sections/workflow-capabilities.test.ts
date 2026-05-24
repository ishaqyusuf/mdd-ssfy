import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { createWwwWorkflowAdminCapabilities } from "./workflow-capabilities";

describe("WWW sales form workflow capabilities", () => {
    test("allows only super admins to edit line pricing", () => {
        for (const role of [
            "Super Admin",
            "super admin",
            "SUPER ADMIN",
            "super-admin",
            "super_admin",
            "SuperAdmin",
        ]) {
            expect(
                createWwwWorkflowAdminCapabilities(role).canEditLinePricing,
            ).toBe(true);
        }
        expect(createWwwWorkflowAdminCapabilities("Admin")).toMatchObject({
            canEditWorkflowComponents: true,
            canEditLinePricing: false,
        });
        expect(createWwwWorkflowAdminCapabilities("Sales")).toMatchObject({
            canEditWorkflowComponents: false,
            canEditLinePricing: false,
        });
    });

    test("wires door size pricing editability through ItemWorkflowPanel", () => {
        const source = readFileSync(
            new URL("./item-workflow-panel.tsx", import.meta.url),
            "utf8",
        );

        expect(source).toMatch(
            /<DoorSizeQtyDialog[\s\S]*canEditPricing=\{[\s\S]*workflowAdminCapabilities\.canEditLinePricing[\s\S]*\}[\s\S]*onPriceSave=/,
        );
    });
});
