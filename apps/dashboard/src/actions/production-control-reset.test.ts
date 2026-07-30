// @ts-nocheck
import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

const productionControlMutationFiles = [
    "create-sales-assignment.ts",
    "submit-sales-assignment.ts",
    "delete-sales-assignment.ts",
    "delete-sales-assignment-submission.ts",
    "create-sales-dispatch-items-action.ts",
    "sales-mark-as-completed.ts",
    "../app-deps/(clean-code)/(sales)/_common/data-access/sales-prod.dta.ts",
    "../app/(clean-code)/(sales)/_common/data-access/sales-prod.dta.ts",
];

const productionInventoryLifecycleMutationFiles = [
    "delete-sales-assignment.ts",
    "delete-sales-assignment-submission.ts",
    "sales-mark-as-completed.ts",
    "sales-progress-fallback.ts",
    "../app-deps/(clean-code)/(sales)/_common/data-access/sales-prod.dta.ts",
    "../app/(clean-code)/(sales)/_common/data-access/sales-prod.dta.ts",
    "../app/(clean-code)/(sales)/_common/data-actions/production-actions/item-assign-action.ts",
];

function readActionFile(path: string) {
    return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("legacy production control mutations", () => {
    it("rebuild canonical sales controls instead of applying partial stat deltas", () => {
        for (const file of productionControlMutationFiles) {
            const source = readActionFile(file);

            expect(
                source.includes("resetSalesAction") ||
                    source.includes("submitProductionAssignment"),
                file,
            ).toBe(true);
            expect(source, file).not.toContain("updateSalesItemStats");
            expect(source, file).not.toContain("updateSalesStatAction");
            expect(source, file).not.toContain("updateSalesProgressDta");
        }
    });

    it("refreshes inventory lifecycle after mutations that can reverse progress", () => {
        for (const file of productionInventoryLifecycleMutationFiles) {
            const source = readActionFile(file);

            expect(source, file).toContain("syncInventoryProductionLifecycleForSale");
        }
    });

    it("routes production submission writers through the shared material-review authority", () => {
        for (const file of [
            "submit-sales-assignment.ts",
            "../app-deps/(clean-code)/(sales)/_common/data-access/sales-prod.dta.ts",
            "../app/(clean-code)/(sales)/_common/data-access/sales-prod.dta.ts",
            "../app/(clean-code)/(sales)/_common/data-actions/production-actions/item-assign-action.ts",
        ]) {
            expect(readActionFile(file), file).toContain(
                "submitProductionAssignment",
            );
        }
    });
});
