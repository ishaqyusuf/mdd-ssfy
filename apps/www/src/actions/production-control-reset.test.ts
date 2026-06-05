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

function readActionFile(path: string) {
    return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("legacy production control mutations", () => {
    it("rebuild canonical sales controls instead of applying partial stat deltas", () => {
        for (const file of productionControlMutationFiles) {
            const source = readActionFile(file);

            expect(source, file).toContain("resetSalesAction");
            expect(source, file).not.toContain("updateSalesItemStats");
            expect(source, file).not.toContain("updateSalesStatAction");
            expect(source, file).not.toContain("updateSalesProgressDta");
        }
    });
});
