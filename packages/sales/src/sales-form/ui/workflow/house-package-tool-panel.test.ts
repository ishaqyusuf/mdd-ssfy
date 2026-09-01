import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { getHousePackageToolRowKey } from "./house-package-tool-panel";

describe("HPT add-size parity", () => {
	it("keeps a row mounted while quantity and swing fields are edited", () => {
		const row = {
			id: 42,
			stepProductId: 7,
			dimension: "2-8 x 6-8",
			swing: "inswing",
			lhQty: 4,
			rhQty: 1,
			totalQty: 5,
		};
		const initialKey = getHousePackageToolRowKey(7, row, 0);

		expect(
			getHousePackageToolRowKey(
				7,
				{ ...row, swing: "outswing", lhQty: 45, totalQty: 46 },
				0,
			),
		).toBe(initialKey);
		expect(
			getHousePackageToolRowKey(
				7,
				{ ...row, id: undefined, swing: "outswing", totalQty: 46 },
				0,
			),
		).toBe(
			getHousePackageToolRowKey(7, { ...row, id: undefined, totalQty: 5 }, 0),
		);
	});

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

	it("allocates enough width for three-digit HPT quantities", () => {
		const source = readFileSync(
			new URL("./house-package-tool-panel.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain("min-w-[660px]");
		expect(
			source.match(/className="w-36 px-2 py-2 text-center"/g),
		).toHaveLength(3);
		expect(source.match(/className="w-32"/g)).toHaveLength(3);
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

	it("renders every selected door as its own stacked panel", () => {
		for (const host of [
			"./sales-form-workflow-panel.tsx",
			"../../../../../../apps/dashboard/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx",
		]) {
			const hostSource = readFileSync(new URL(host, import.meta.url), "utf8");

			expect(hostSource).toContain(
				"const doorPanels = selectedDoorComponents.length",
			);
			expect(hostSource).toContain(
				"doorPanels.map((doorComponent, doorIndex)",
			);
			expect(hostSource).toMatch(
				/selectedDoorComponents=\{\s*activeDoorComponent \? \[activeDoorComponent\] : \[\]\s*\}/,
			);
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

	it("keeps custom price outside the admin-only HPT pricing guard", () => {
		const source = readFileSync(
			new URL("./house-package-tool-panel.tsx", import.meta.url),
			"utf8",
		);
		const addonFieldIndex = source.indexOf("{pricingLabels.addonPrice}");
		const guardEndIndex = source.indexOf(") : null}", addonFieldIndex);
		const customFieldIndex = source.indexOf(
			"{pricingLabels.customPrice}",
			addonFieldIndex,
		);

		expect(addonFieldIndex).toBeGreaterThan(-1);
		expect(guardEndIndex).toBeGreaterThan(addonFieldIndex);
		expect(customFieldIndex).toBeGreaterThan(guardEndIndex);
	});
});
