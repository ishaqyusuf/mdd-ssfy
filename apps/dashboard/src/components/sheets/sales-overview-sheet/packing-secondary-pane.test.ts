import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { buildLegacySalesOverviewTabNavigation } from "./tab-navigation";

function source(path: string) {
	return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("Sales Overview packing secondary pane", () => {
	test("routes Pack Items through the canonical secondary-sheet state", () => {
		const sheet = source("./index.tsx");
		const controller = source("./controller.tsx");
		const packingTab = source("./packing-tab.tsx");

		expect(sheet.includes('| { kind: "packing" }')).toBe(true);
		expect(sheet.includes("setPackItemsOpen")).toBe(true);
		expect(sheet.includes('pane?.kind === "packing"')).toBe(true);
		expect(controller.includes("packItemsOpen={packItemsOpen}")).toBe(true);
		expect(
			controller.includes("onPackItemsOpenChange={onPackItemsOpenChange}"),
		).toBe(true);
		expect(packingTab.includes("packItemsOpen={packItemsOpen}")).toBe(true);
		expect(
			packingTab.includes("onPackItemsOpenChange={onPackItemsOpenChange}"),
		).toBe(true);
		expect(controller.includes('value: "packing"')).toBe(true);
		expect(controller.includes("hidden: true")).toBe(false);
		expect(sheet.includes("buildLegacySalesOverviewTabNavigation")).toBe(true);
	});

	test("navigates from Packing without overwriting the canonical sheet mode", () => {
		const navigation = buildLegacySalesOverviewTabNavigation(
			"dispatch",
			"packing",
		);

		expect(navigation).toEqual({
			closePackingPane: true,
			params: {
				salesTab: "dispatch",
				"prod-item-tab": null,
				"prod-item-view": null,
				dispatchOverviewId: null,
			},
		});
		expect("mode" in navigation.params).toBe(false);
	});

	test("keeps the item summary in place and portals the packing form", () => {
		const packing = source("../../dispatch-packing-overview/index.tsx");

		expect(packing.includes("SalesOverviewSheet.SecondaryContent")).toBe(true);
		expect(packing.includes("SalesOverviewSheet.SecondaryHeader")).toBe(true);
		expect(packing.includes("SalesOverviewSheet.SecondaryFooter")).toBe(true);
		expect(packing.includes('title="Pack items"')).toBe(true);
		expect(packing.includes("form={formId}")).toBe(true);
		expect(packing.includes("onPackItemsOpenChange(true)")).toBe(true);
		expect(packing.includes("rows.map((item, index)")).toBe(true);
		expect(packing.includes("isPackMode")).toBe(false);
		expect(packing.includes("max-h-[60vh]")).toBe(false);
	});

	test("keeps guarded packing inside the normal submit flow", () => {
		const packing = source("../../dispatch-packing-overview/index.tsx");

		expect(packing.includes("<PackingReportReview")).toBe(false);
		expect(packing.includes("Guarded packing review")).toBe(false);
		expect(packing.includes("buildGuardedPackingPlan")).toBe(true);
		expect(packing.includes("Confirm guarded packing")).toBe(true);
		expect(packing.includes("onClick={proceedWithGuardedPacking}")).toBe(true);
	});

	test("uses borderless shadcn items and the shared Sales Form stepper", () => {
		const packing = source("../../dispatch-packing-overview/index.tsx");

		expect(packing.includes("<ItemGroup>")).toBe(true);
		expect(packing.includes("<ItemSeparator />")).toBe(true);
		expect(packing.includes("<ItemContent")).toBe(true);
		expect(packing.includes("<ItemTitle")).toBe(true);
		expect(packing.includes("<ItemDescription")).toBe(true);
		expect(packing.includes("SalesFormQuantityStepper")).toBe(true);
		expect(packing.includes("stepQtyValue")).toBe(false);
		expect(packing.includes('className="rounded-md border p-3"')).toBe(false);
	});
});
