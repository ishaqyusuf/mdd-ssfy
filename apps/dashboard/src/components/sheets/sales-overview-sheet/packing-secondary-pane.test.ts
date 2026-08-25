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
		expect(controller.includes('label: "Overview"')).toBe(true);
		expect(controller.includes('label: "Packing List"')).toBe(false);
		expect(controller.includes('value: "dispatch-notes"')).toBe(false);
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

	test("resets the shared sheet viewport when the active tab changes", () => {
		const sheet = source("./index.tsx");

		expect(sheet.includes("<Sheet.Content\n\t\t\t\t\t\tkey={activeTab}")).toBe(
			true,
		);
	});

	test("keeps the item summary in place and portals the packing form", () => {
		const packing = source("../../dispatch-packing-overview/index.tsx");
		const packingSheet = source(
			"../../dispatch-packing-overview/packing-side-sheet.tsx",
		);

		expect(packing.includes("<PackingSideSheet")).toBe(true);
		expect(packingSheet.includes("CustomSheet.SecondaryContent")).toBe(true);
		expect(packingSheet.includes("CustomSheet.SecondaryHeader")).toBe(true);
		expect(packingSheet.includes("CustomSheet.SecondaryFooter")).toBe(true);
		expect(packingSheet.includes('title="Pack items"')).toBe(true);
		expect(packingSheet.includes("actions={status}")).toBe(true);
		expect(packing.includes("onSubmit={submitPacking}")).toBe(true);
		expect(packing.includes("onPackItemsOpenChange(true)")).toBe(true);
		expect(packing.includes("rows.map((item, index)")).toBe(true);
		expect(packing.includes("isPackMode")).toBe(false);
		expect(packing.includes("max-h-[60vh]")).toBe(false);
	});

	test("keeps nested sheet navigation unambiguous", () => {
		const sheetPrimitive = source(
			"../../../../../../packages/ui/src/components/custom/sheet-v2.tsx",
		);

		expect(sheetPrimitive.includes("!sheet.secondaryOpened")).toBe(true);
		expect(sheetPrimitive.includes("actions?: ReactNode")).toBe(true);
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
		expect(packing.match(/<ItemTitle className="uppercase">/g)?.length).toBe(3);
		expect(
			packing.match(/<ItemDescription className="line-clamp-none uppercase">/g)
				?.length,
		).toBe(3);
	});

	test("implements the approved ready and waiting side-sheet hierarchy", () => {
		const packing = source("../../dispatch-packing-overview/index.tsx");
		const packingSheet = source(
			"../../dispatch-packing-overview/packing-side-sheet.tsx",
		);
		const sheetPrimitive = source(
			"../../../../../../packages/ui/src/components/custom/sheet-v2.tsx",
		);

		expect(packing.includes('label="Ready to pack"')).toBe(true);
		expect(packing.includes('label="Awaiting production"')).toBe(true);
		expect(packing.includes("readyItems.map((item, index)")).toBe(true);
		expect(packing.includes("waitingItems.map((item, index)")).toBe(true);
		expect(packing.includes("max={Number(packAllTarget[key] || 0)}")).toBe(
			true,
		);
		expect(packing.includes("Not packable yet")).toBe(true);
		expect(packingSheet.includes("data-packing-selected-count")).toBe(true);
		expect(packingSheet.includes("Pack all ${maxPackableCount} ready")).toBe(
			true,
		);
		expect(packingSheet.includes("sticky top-0")).toBe(true);
		expect(sheetPrimitive.includes("actions?: ReactNode")).toBe(true);
		expect(sheetPrimitive.includes("props.actions")).toBe(true);
	});
});
