// @ts-expect-error apps/dealership typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
	return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("dealer quote edit lock surfaces", () => {
	it("replaces quote-list edit actions with server-derived locked states", () => {
		const tableColumns = source("../tables/quotes/columns.tsx");
		const legacyDocuments = source("./dealer-sales-documents.tsx");

		for (const content of [tableColumns, legacyDocuments]) {
			expect(content).toContain("editLocked");
			expect(content).toContain("editLockReason");
			expect(content).toContain("Editing locked");
		}
	});

	it("blocks direct edit-route composer access for a locked request", () => {
		const editPage = source("../../app/quotes/[slug]/edit/page.tsx");

		expect(editPage).toContain("getDealerQuoteEditLock");
		expect(editPage).toContain("Quote locked for editing");
		expect(editPage).toContain("Back to dealer quotes");
		expect(editPage).toContain("editLock.locked ? (");
	});
});
