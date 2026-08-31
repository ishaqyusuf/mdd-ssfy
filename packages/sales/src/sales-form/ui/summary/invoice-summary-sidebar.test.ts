import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("invoice summary sidebar layout", () => {
	it("contains the desktop flex child inside the summary rail", () => {
		const source = readFileSync(
			new URL("./invoice-summary-sidebar.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain("xl:shrink-0");
		expect(source).toContain("top-[var(--header-height)]");
		expect(source).toContain('className="flex h-full w-full min-w-0 flex-col"');
		expect(source).toContain("overflow-x-hidden overflow-y-auto");
	});

	it("keeps the primary save separate from the explicit draft action", () => {
		const sidebarSource = readFileSync(
			new URL("./invoice-summary-sidebar.tsx", import.meta.url),
			"utf8",
		);
		const shellSource = readFileSync(
			new URL("../shell/sales-form-shell.tsx", import.meta.url),
			"utf8",
		);

		expect(sidebarSource).toContain("onSaveDraft: () => void");
		expect(sidebarSource).toContain("onClick={props.onSaveFinal}");
		expect(sidebarSource).toContain(
			"props.isSaving || !props.permissions.canFinalize",
		);
		expect(sidebarSource).toContain("props.onSaveDraft();");
		expect(shellSource).toContain(
			"onSaveDraft={() => void props.onSaveDraft?.()}",
		);
		expect(shellSource).toContain(
			"onSaveFinal={() => void props.onSaveFinal?.()}",
		);
	});
});
