import { describe, expect, it } from "bun:test";
import {
	buildInitialWorkflowShelfPatch,
	buildWorkflowDoorSyncPatch,
	buildWorkflowShelfSyncPatch,
} from "./workflow-sync-patches";

const shelfItemStep = {
	step: { title: "Item Type" },
	value: "Shelf Items",
};

describe("workflow sync patches", () => {
	it("builds shelf sync patches from stored shelf rows", () => {
		const patch = buildWorkflowShelfSyncPatch(
			{
				uid: "line-1",
				qty: 0,
				unitPrice: 0,
				lineTotal: 0,
				formSteps: [shelfItemStep],
				shelfItems: [
					{
						uid: "row-1",
						qty: 2,
						unitPrice: 12,
						totalPrice: 0,
					},
				],
			},
			1,
		);

		expect(patch?.lineUid).toBe("line-1");
		expect(patch?.qty).toBe(2);
		expect(patch?.unitPrice).toBe(12);
		expect(patch?.lineTotal).toBe(24);
		expect((patch?.linePatch as any)?.shelfItems).toHaveLength(1);
		expect(patch?.changed.totalChanged).toBe(true);
	});

	it("builds an initial shelf patch only for empty shelf item lines", () => {
		const patch = buildInitialWorkflowShelfPatch({
			uid: "line-1",
			formSteps: [shelfItemStep],
			shelfItems: [],
		});

		expect(patch?.lineUid).toBe("line-1");
		expect((patch?.linePatch as any)?.shelfItems).toHaveLength(1);
	});

	it("builds door sync patches with route overrides", () => {
		const patch = buildWorkflowDoorSyncPatch({
			line: {
				uid: "line-door",
				qty: 0,
				lineTotal: 0,
				formSteps: [
					{ step: { title: "Item Type" }, value: "Door" },
					{
						step: { title: "Door" },
						prodUid: "door-a",
						meta: {
							selectedComponents: [
								{
									id: 10,
									uid: "door-a",
									title: "Door A",
									sectionOverride: {
										overrideMode: true,
										noHandle: true,
										hasSwing: false,
									},
								},
							],
						},
					},
					{ step: { title: "House Package Tool" } },
				],
				housePackageTool: {
					id: null,
					doors: [
						{
							stepProductId: 10,
							dimension: "24 x 80",
							swing: "LH",
							lhQty: 2,
							rhQty: 3,
							totalQty: 4,
							unitPrice: 15,
							lineTotal: 0,
						},
					],
				},
			},
			availableComponents: [],
			activeDoorUid: "door-a",
			profileCoefficient: 1,
		});

		expect(patch?.lineUid).toBe("line-door");
		expect(patch?.totalDoors).toBe(4);
		expect(patch?.totalPrice).toBe(60);
		expect((patch?.linePatch as any)?.housePackageTool?.doors?.[0]?.swing).toBe(
			"",
		);
		expect((patch?.linePatch as any)?.housePackageTool?.doors?.[0]?.lhQty).toBe(
			0,
		);
	});
});
