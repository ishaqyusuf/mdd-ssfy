// @ts-nocheck
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

function readWorkspaceFile(path: string) {
    return readFileSync(join(process.cwd(), path), "utf8");
}

describe("sales inventory sync save paths", () => {
    it("queues inventory line sync after new-form draft and final saves", () => {
        const source = readWorkspaceFile("apps/api/src/db/queries/new-sales-form.ts");
        const draftStart = source.indexOf("export async function saveDraftNewSalesForm");
        const finalStart = source.indexOf("export async function saveFinalNewSalesForm");
        const draftSource = source.slice(draftStart, finalStart);
        const finalSource = source.slice(finalStart);

        expect(draftSource).toContain("queueSalesInventoryLineItemsSync");
        expect(draftSource).toContain('source: "new-form"');
        expect(draftSource).toContain("triggeredByUserId: ctx.userId ?? null");

        expect(finalSource).toContain("queueSalesInventoryLineItemsSync");
        expect(finalSource).toContain('source: "new-form"');
        expect(finalSource).toContain("triggeredByUserId: ctx.userId ?? null");
    });

    it("queues inventory line sync after old-form saves succeed", () => {
        const source = readWorkspaceFile(
            "apps/www/src/app/(clean-code)/(sales)/_common/data-access/save-sales/index.dta.ts",
        );

        expect(source).toContain("queueSalesInventoryLineItemsSync");
        expect(source).toContain("!result?.data?.error && result?.salesId");
        expect(source).toContain('source: "old-form"');
    });
});
