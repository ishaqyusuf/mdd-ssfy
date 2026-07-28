import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

function source(name: string) {
	return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

describe("page tab animated counts", () => {
	it("uses the shared animated number for inline, overflow, and managed tab counts", () => {
		const pageTabs = source("page-tabs.tsx");
		const manageDialog = source("manage-page-tabs-dialog.tsx");

		expect(pageTabs.match(/<AnimatedNumber/g)).toHaveLength(2);
		expect(manageDialog.match(/<AnimatedNumber/g)).toHaveLength(1);
		expect(pageTabs.match(/currency="number"/g)).toHaveLength(2);
		expect(manageDialog.match(/currency="number"/g)).toHaveLength(1);
	});
});
