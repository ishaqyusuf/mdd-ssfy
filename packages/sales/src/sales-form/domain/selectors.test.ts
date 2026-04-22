import { describe, expect, it } from "bun:test";
import {
	findLineStepByTitle,
	getItemType,
	getSelectedDoorComponentsForLine,
	getSelectedMouldingComponentsForLine,
	isMouldingItem,
	isServiceItem,
	isShelfItem,
} from "./selectors";

describe("selectors domain", () => {
	const line = {
		formSteps: [
			{
				step: { title: "Item Type" },
				value: "Moulding",
			},
			{
				step: { title: "Door" },
				prodUid: "door-1",
				value: "Door A",
			},
			{
				step: { title: "Moulding" },
				prodUid: "m-1",
				value: "Casing",
			},
		],
	};

	it("resolves item type and type predicates", () => {
		expect(getItemType(line)).toBe("moulding");
		expect(isMouldingItem(line)).toBe(true);
		expect(isServiceItem(line)).toBe(false);
		expect(isShelfItem(line)).toBe(false);
	});

	it("treats molding/mouldings variants as moulding item type", () => {
		const variantLine = {
			formSteps: [
				{
					step: { title: "Item Type" },
					value: "Moldings",
				},
			],
		};
		expect(isMouldingItem(variantLine)).toBe(true);
	});

	it("finds line step by title", () => {
		const step = findLineStepByTitle(line, "Door");
		expect(step?.value).toBe("Door A");
	});

	it("extracts selected door components fallback", () => {
		const doors = getSelectedDoorComponentsForLine(line);
		expect(doors).toHaveLength(1);
		expect(doors[0].uid).toBe("door-1");
	});

	it("preserves richer selected component metadata", () => {
		const richLine = {
			formSteps: [
				{
					step: { title: "Door" },
					meta: {
						selectedComponents: [
							{
								id: 11,
								uid: "door-rich",
								title: "Door Rich",
								salesPrice: 150,
								basePrice: 100,
								pricing: { "2-8 x 7-0": { price: 150 } },
								redirectUid: "next",
								sectionOverride: { overrideMode: true, noHandle: true },
							},
						],
					},
				},
			],
		};
		const doors = getSelectedDoorComponentsForLine(richLine);
		expect(doors[0].pricing).toEqual({ "2-8 x 7-0": { price: 150 } });
		expect(doors[0].redirectUid).toBe("next");
		expect(doors[0].sectionOverride).toEqual({
			overrideMode: true,
			noHandle: true,
		});
	});

	it("backfills selected doors from selected uids and persisted HPT rows when candidates are available", () => {
		const reopenedLine = {
			formSteps: [
				{
					step: { title: "Door" },
					prodUid: "door-a",
					componentId: 11,
					value: "Door A",
					meta: {
						selectedProdUids: ["door-a"],
					},
				},
			],
			housePackageTool: {
				doors: [{ stepProductId: 22, dimension: '3-0 x 7-0"' }],
			},
		};

		const doors = getSelectedDoorComponentsForLine(reopenedLine, {
			availableComponents: [
				{
					id: 11,
					uid: "door-a",
					title: "Door A",
					salesPrice: 100,
					basePrice: 80,
				},
				{
					id: 22,
					uid: "door-b",
					title: "Door B",
					salesPrice: 120,
					basePrice: 90,
				},
			],
		});

		expect(doors.map((door) => door.uid)).toEqual(["door-a", "door-b"]);
		expect(doors[1].id).toBe(22);
		expect(doors[1].title).toBe("Door B");
	});

	it("extracts selected moulding components fallback", () => {
		const mouldings = getSelectedMouldingComponentsForLine(line);
		expect(mouldings).toHaveLength(1);
		expect(mouldings[0].uid).toBe("m-1");
	});
});
