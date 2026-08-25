import { describe, expect, it } from "bun:test";
// @ts-nocheck
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readWorkspaceFile(path: string) {
    return readFileSync(join(process.cwd(), path), "utf8");
}

describe("sales inventory sync save paths", () => {
    it("queues inventory line sync after new-form draft and final saves", () => {
		const source = readWorkspaceFile(
			"apps/api/src/db/queries/new-sales-form.ts",
		);
		const draftStart = source.indexOf(
			"export async function saveDraftNewSalesForm",
		);
		const finalStart = source.indexOf(
			"export async function saveFinalNewSalesForm",
		);
		const postSaveStart = source.indexOf(
			"async function runNewSalesFormPostSaveTasks",
		);
        const draftSource = source.slice(draftStart, finalStart);
        const finalSource = source.slice(finalStart);
		const postSaveSource = source.slice(postSaveStart, draftStart);

		expect(postSaveSource).toContain("queueSalesInventoryLineItemsSync");
		expect(postSaveSource).toContain("normalizeSalesInventoryLegacyStatus");
		expect(postSaveSource).toContain('source: "new-form"');
		expect(postSaveSource).toContain("triggeredByUserId: ctx.userId ?? null");
		expect(draftSource).toContain("runNewSalesFormPostSaveTasks(ctx, result)");
		expect(finalSource).toContain("runNewSalesFormPostSaveTasks(ctx, result)");
    });

    it("queues inventory line sync after old-form saves succeed", () => {
        const source = readWorkspaceFile(
            "apps/dashboard/src/app/(clean-code)/(sales)/_common/data-access/save-sales/index.dta.ts",
        );

        expect(source).toContain("queueSalesInventoryLineItemsSync");
		expect(source).toContain("normalizeSalesInventoryLegacyStatus");
		expect(source).toContain("!result?.data?.error &&");
		expect(source).toContain("result?.salesId &&");
        expect(source).toContain('source: "old-form"');
    });

	it("queues legacy adaptation and routes ordinary saves to Sales Overview inventory", () => {
		const oldFormSource = readWorkspaceFile(
			"apps/dashboard/src/components/forms/sales-form/sales-form-save.tsx",
		);
		const newFormSource = readWorkspaceFile(
			"apps/dashboard/src/components/forms/new-sales-form/new-sales-form.tsx",
		);

		for (const source of [oldFormSource, newFormSource]) {
			expect(source).toContain("resolveLegacyInventoryPostSaveAction");
			expect(source).toContain("legacyInventoryAdaptation.queue");
			expect(source).toContain("buildSalesOverviewUrl");
			expect(source).toContain('salesTab: "inventory"');
			expect(source).not.toContain("useSalesInventoryConfiguratorPrompt");
		}
		expect(newFormSource).toContain(
			"continueToInventoryAfterSave(currentRecord, false)",
		);
	});
});
