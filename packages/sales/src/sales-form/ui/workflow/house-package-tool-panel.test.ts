import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("HPT add-size parity", () => {
	it("keeps Add Size available before the first size row exists", () => {
		const source = readFileSync(
			new URL("./house-package-tool-panel.tsx", import.meta.url),
			"utf8",
		);
		const emptySummaryBranch = source.slice(
			source.indexOf("!props.summary.rows.length"),
			source.indexOf("!rowsForComponent.length"),
		);
		expect(emptySummaryBranch).toContain("HptAddSizeMenu");
		expect(emptySummaryBranch).toContain("onAddSize={props.onAddSize}");
	});

	it("keeps Add Size available when another door owns the only rows", () => {
		const source = readFileSync(
			new URL("./house-package-tool-panel.tsx", import.meta.url),
			"utf8",
		);
		const emptyFocusedBranch = source.slice(
			source.indexOf("!rowsForComponent.length"),
			source.indexOf(
				'<article className="overflow-hidden rounded-lg border bg-background">',
			),
		);
		expect(emptyFocusedBranch).toContain("HptAddSizeMenu");
		expect(emptyFocusedBranch).toContain("Configure Sizes");
	});

	it("describes configured and unconfigured prices in the Add Size menu", () => {
		const source = readFileSync(
			new URL("./house-package-tool-panel.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain("props.formatMoney(option.doorPrice)");
		expect(source).toContain('"Price unavailable"');
	});

	it("shows selected sizes as disabled Add Size options", () => {
		const source = readFileSync(
			new URL("./house-package-tool-panel.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain("selected: boolean");
		expect(source).toContain("disabled={option.selected}");
		expect(source).toContain('"Selected"');

		for (const host of [
			"./sales-form-workflow-panel.tsx",
			"../../../../../../apps/dashboard/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx",
		]) {
			const hostSource = readFileSync(new URL(host, import.meta.url), "utf8");
			expect(hostSource).toContain("const selected =");
			expect(hostSource).toContain("selected,");
		}
	});

	it("offers a permission-gated row repair action only when price drift exists", () => {
		const source = readFileSync(
			new URL("./house-package-tool-panel.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain("getDoorRowProfilePriceDrift");
		expect(source).toContain("repairDoorRowProfilePriceDrift");
		expect(source).toContain("props.canEditPricing && profilePriceDrift");
		expect(source).toContain('aria-label={`Repair price for ${row.dimension || "door size"}`}');
	});
});
