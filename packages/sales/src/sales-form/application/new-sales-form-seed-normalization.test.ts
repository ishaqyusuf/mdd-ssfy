import { describe, expect, it } from "bun:test";
import type { NewSalesFormSeed } from "../contracts/new-sales-form-seed";
import { normalizeNewSalesFormSeed } from "./new-sales-form-seed-normalization";

describe("normalizeNewSalesFormSeed", () => {
	it("converts moulding linear feet to native piece rows and line quantity", () => {
		const seed = {
			schemaVersion: 2,
			lineItems: [
				{
					uid: "moulding-line",
					qty: 1,
					formSteps: [
						{ stepId: 1, prodUid: "mouldings" },
						{
							stepId: 215,
							meta: { selectedProdUids: ["baseboard-16"] },
						},
					],
					meta: {
						mouldingRows: [
							{
								uid: "baseboard-16",
								calculation: {
									linearFeet: 400,
									pieceLength: 16,
									wastePercentage: 10,
								},
							},
						],
					},
				},
			],
			unresolved: [],
		} as NewSalesFormSeed;

		expect(normalizeNewSalesFormSeed(seed).lineItems[0]).toMatchObject({
			qty: 28,
			meta: {
				mouldingRows: [{ uid: "baseboard-16", qty: 28 }],
			},
		});
	});

	it("groups identical HPT configurations and remaps unresolved entries", () => {
		const seed: NewSalesFormSeed = {
			schemaVersion: 2,
			lineItems: [
				{
					uid: "line-34",
					qty: 11,
					formSteps: [
						{ stepId: 1, prodUid: "slab" },
						{ stepId: 2, prodUid: "six-eight" },
					],
					housePackageTool: {
						doors: [{ dimension: "2-10 x 6-8", totalQty: 11 }],
					},
				},
				{
					uid: "line-36",
					qty: 2,
					formSteps: [
						{ stepId: 2, prodUid: "six-eight" },
						{ stepId: 1, prodUid: "slab" },
					],
					housePackageTool: {
						doors: [{ dimension: "3-0 x 6-8", totalQty: 2 }],
					},
				},
			],
			unresolved: [
				{
					lineUid: "line-36",
					stepId: null,
					field: "finish",
					status: "ambiguous",
					reason: "Finish needs review",
				},
			],
		};

		expect(normalizeNewSalesFormSeed(seed)).toEqual({
			schemaVersion: 2,
			lineItems: [
				{
					uid: "line-34",
					qty: 13,
					formSteps: [
						{ stepId: 1, prodUid: "slab" },
						{ stepId: 2, prodUid: "six-eight" },
					],
					housePackageTool: {
						doors: [
							{ dimension: "2-10 x 6-8", totalQty: 11 },
							{ dimension: "3-0 x 6-8", totalQty: 2 },
						],
					},
				},
			],
			unresolved: [
				{
					lineUid: "line-34",
					stepId: null,
					field: "finish",
					status: "ambiguous",
					reason: "Finish needs review",
				},
			],
		});
	});

	it("combines duplicate size rows inside one HPT line", () => {
		const seed: NewSalesFormSeed = {
			schemaVersion: 2,
			lineItems: [
				{
					uid: "line-1",
					qty: 3,
					formSteps: [{ stepId: 1, prodUid: "slab" }],
					housePackageTool: {
						doors: [
							{ dimension: "3-0 x 6-8", totalQty: 1 },
							{ dimension: "3-0 x 6-8", totalQty: 2 },
						],
					},
				},
			],
			unresolved: [],
		};

		const result = normalizeNewSalesFormSeed(seed);
		expect(result.lineItems[0]).toMatchObject({
			qty: 3,
			housePackageTool: {
				doors: [{ dimension: "3-0 x 6-8", totalQty: 3 }],
			},
		});
	});
});
