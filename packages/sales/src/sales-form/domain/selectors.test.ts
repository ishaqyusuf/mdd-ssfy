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

	it("reads selected doors from nested route-step metadata on edit reopen", () => {
		const reopenedLine = {
			formSteps: [
				{
					step: {
						title: "Door",
						meta: {
							selectedComponents: [
								{
									id: 44,
									uid: "door-nested",
									title: "Nested Door",
									img: "door.png",
									salesPrice: 240,
									basePrice: 180,
									pricing: { "3-0 x 8-0": { price: 240 } },
									supplierVariants: [{ id: 7, supplierUid: "sup-a" }],
								},
							],
						},
					},
					meta: {},
				},
			],
		};

		const doors = getSelectedDoorComponentsForLine(reopenedLine);

		expect(doors).toHaveLength(1);
		expect(doors[0]).toMatchObject({
			id: 44,
			uid: "door-nested",
			title: "Nested Door",
			img: "door.png",
			salesPrice: 240,
			basePrice: 180,
			pricing: { "3-0 x 8-0": { price: 240 } },
		});
		expect(doors[0].supplierVariants).toEqual([
			{ id: 7, supplierUid: "sup-a" },
		]);
	});

	it("reads selected doors from JSON nested route-step metadata", () => {
		const reopenedLine = {
			formSteps: [
				{
					step: {
						title: "Door",
						meta: JSON.stringify({
							selectedComponents: [
								{
									id: 45,
									uid: "door-json",
									title: "JSON Door",
									salesPrice: 260,
									basePrice: 190,
								},
							],
						}),
					},
					meta: {},
				},
			],
		};

		const doors = getSelectedDoorComponentsForLine(reopenedLine);

		expect(doors.map((door) => door.uid)).toEqual(["door-json"]);
		expect(doors[0].title).toBe("JSON Door");
		expect(doors[0].salesPrice).toBe(260);
	});

	it("uses JSON door step metadata for fallback selected door fields", () => {
		const fallbackLine = {
			formSteps: [
				{
					step: { title: "Door" },
					prodUid: "door-fallback",
					componentId: 51,
					value: "Fallback Door",
					price: 125,
					basePrice: 95,
					meta: JSON.stringify({
						img: "fallback.png",
						inventoryId: 12,
						inventoryVariantId: 34,
						redirectUid: "next-door-step",
						sectionOverride: { noHandle: true },
					}),
				},
			],
		};

		const doors = getSelectedDoorComponentsForLine(fallbackLine);

		expect(doors).toEqual([
			expect.objectContaining({
				id: 51,
				uid: "door-fallback",
				title: "Fallback Door",
				img: "fallback.png",
				inventoryId: 12,
				inventoryVariantId: 34,
				redirectUid: "next-door-step",
				sectionOverride: { noHandle: true },
			}),
		]);
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

	it("backfills selected mouldings from persisted moulding rows on edit reopen", () => {
		const reopenedLine = {
			formSteps: [
				{
					step: { title: "Item Type" },
					value: "Moulding",
				},
				{
					step: { title: "Moulding" },
					value: "Casing, Stop",
				},
			],
			meta: {
				mouldingRows: [
					{
						uid: "m-1",
						title: "Casing",
						img: "casing.png",
						description: "Casing",
						qty: 2,
						salesPrice: 70,
						basePrice: 55,
					},
					{
						uid: "m-2",
						title: "Stop",
						description: "Stop",
						qty: 1,
						salesPrice: 35,
						basePrice: 22,
					},
				],
			},
		};

		const mouldings = getSelectedMouldingComponentsForLine(reopenedLine);

		expect(mouldings.map((moulding) => moulding.uid)).toEqual(["m-1", "m-2"]);
		expect(mouldings[0].title).toBe("Casing");
		expect(mouldings[0].img).toBe("casing.png");
		expect(mouldings[1].salesPrice).toBe(35);
	});

	it("reads selected mouldings from nested route-step metadata on edit reopen", () => {
		const reopenedLine = {
			formSteps: [
				{
					step: { title: "Item Type" },
					value: "Moulding",
				},
				{
					step: {
						title: "Moulding",
						meta: {
							selectedComponents: [
								{
									id: 33,
									uid: "m-nested",
									title: "Nested Casing",
									img: "nested.png",
									salesPrice: 44,
									basePrice: 30,
								},
							],
						},
					},
					meta: {},
				},
			],
		};

		const mouldings = getSelectedMouldingComponentsForLine(reopenedLine);

		expect(mouldings).toHaveLength(1);
		expect(mouldings[0]).toMatchObject({
			id: 33,
			uid: "m-nested",
			title: "Nested Casing",
			img: "nested.png",
			salesPrice: 44,
			basePrice: 30,
		});
	});

	it("reads selected mouldings from JSON nested route-step metadata", () => {
		const reopenedLine = {
			formSteps: [
				{
					step: { title: "Item Type" },
					value: "Moulding",
				},
				{
					step: {
						title: "Moulding",
						meta: JSON.stringify({
							selectedComponents: [
								{
									id: 34,
									uid: "m-json",
									title: "JSON Casing",
									salesPrice: 55,
									basePrice: 40,
								},
							],
						}),
					},
					meta: {},
				},
			],
		};

		const mouldings = getSelectedMouldingComponentsForLine(reopenedLine);

		expect(mouldings.map((moulding) => moulding.uid)).toEqual(["m-json"]);
		expect(mouldings[0].title).toBe("JSON Casing");
		expect(mouldings[0].salesPrice).toBe(55);
	});

	it("backfills selected mouldings from JSON persisted moulding rows", () => {
		const reopenedLine = {
			formSteps: [
				{
					step: { title: "Item Type" },
					value: "Moulding",
				},
				{
					step: { title: "Moulding" },
					value: "Casing, Stop",
				},
			],
			meta: JSON.stringify({
				mouldingRows: [
					{
						uid: "m-json-row-1",
						title: "JSON Casing",
						qty: 2,
						salesPrice: 70,
						basePrice: 55,
					},
					{
						uid: "m-json-row-2",
						description: "JSON Stop",
						qty: 1,
						salesPrice: 35,
						basePrice: 22,
					},
				],
			}),
		};

		const mouldings = getSelectedMouldingComponentsForLine(reopenedLine);

		expect(mouldings.map((moulding) => moulding.uid)).toEqual([
			"m-json-row-1",
			"m-json-row-2",
		]);
		expect(mouldings[0].title).toBe("JSON Casing");
		expect(mouldings[1].title).toBe("JSON Stop");
		expect(mouldings[1].salesPrice).toBe(35);
	});

	it("uses JSON moulding step metadata for fallback selected moulding fields", () => {
		const fallbackLine = {
			formSteps: [
				{
					step: { title: "Item Type" },
					value: "Moulding",
				},
				{
					step: { title: "Moulding" },
					prodUid: "m-fallback",
					componentId: 77,
					value: "Fallback Casing",
					price: 42,
					basePrice: 30,
					meta: JSON.stringify({
						img: "moulding.png",
						inventoryId: 18,
						inventoryVariantId: 19,
						redirectUid: "next-moulding-step",
						sectionOverride: { casing: true },
					}),
				},
			],
		};

		const mouldings = getSelectedMouldingComponentsForLine(fallbackLine);

		expect(mouldings).toEqual([
			expect.objectContaining({
				id: 77,
				uid: "m-fallback",
				title: "Fallback Casing",
				img: "moulding.png",
				inventoryId: 18,
				inventoryVariantId: 19,
				redirectUid: "next-moulding-step",
				sectionOverride: { casing: true },
			}),
		]);
	});
});
