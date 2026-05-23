import { describe, expect, it } from "bun:test";
import { buildInventorySyncComponentCandidatesForItem } from "./sync-sales-inventory-line-items";

const emptyItem = {
	id: 10,
	description: "Package line",
	meta: {},
	formSteps: [],
	shelfItems: [],
	housePackageTool: null,
};

describe("sync sales inventory line items", () => {
	it("extracts package-authored form step, shelf, HPT, and door candidates from item metadata", () => {
		const candidates = buildInventorySyncComponentCandidatesForItem({
			...emptyItem,
			meta: {
				formSteps: [
					{
						prodUid: "door-root",
						qty: 1,
						value: "Entry Door",
						step: {
							uid: "item-type-step",
							title: "Item Type",
						},
						meta: {
							selectedComponents: [
								{
									id: 501,
									uid: "door-501",
									title: "30in Door",
								},
							],
						},
					},
					{
						prodUid: "door-501",
						qty: 2,
						value: "30in Door",
						step: {
							uid: "door-step",
							title: "Door",
						},
						meta: {
							selectedComponents: [
								{
									id: 501,
									uid: "door-501",
									title: "30in Door",
								},
							],
						},
					},
				],
				shelfItems: [
					{
						productId: 44,
						categoryId: 12,
						description: "Shelf board",
						qty: 3,
					},
				],
				housePackageTool: {
					totalDoors: 2,
					doors: [
						{
							stepProductId: 501,
							totalQty: 2,
							dimension: "30 x 80",
						},
					],
				},
			},
		});

		expect(candidates.map((candidate) => candidate.sourceType)).toEqual([
			"dyke-step-product",
			"dyke-step-product",
			"shelf-product",
			"dyke-house-package",
			"dyke-door-product",
		]);
		expect(candidates.map((candidate) => candidate.sourceUid)).toEqual([
			"door-root",
			"door-501",
			"shelf-prod-44",
			"door-501",
			"door-501",
		]);
		expect(candidates.map((candidate) => candidate.qty)).toEqual([
			1, 2, 3, 2, 2,
		]);
		expect(candidates[2]?.inventoryName).toBe("Shelf board");
		expect(candidates[3]?.inventoryCategoryTitle).toBe("Door");
	});

	it("prefers relational candidates over metadata fallbacks when both exist", () => {
		const candidates = buildInventorySyncComponentCandidatesForItem({
			...emptyItem,
			meta: {
				shelfItems: [
					{
						productId: 44,
						categoryId: 12,
						description: "Metadata shelf",
						qty: 3,
					},
				],
			},
			shelfItems: [
				{
					productId: 55,
					categoryId: 13,
					description: "Relational shelf",
					qty: 4,
					shelfProduct: {
						id: 55,
						title: "Relational shelf",
					},
					category: {
						id: 13,
						name: "Shelves",
					},
				},
			],
		});

		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.sourceUid).toBe("shelf-prod-55");
		expect(candidates[0]?.qty).toBe(4);
		expect(candidates[0]?.inventoryName).toBe("Relational shelf");
	});
});
