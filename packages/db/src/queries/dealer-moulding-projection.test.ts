import { describe, expect, test } from "bun:test";
import { buildDealerMouldingProjection } from "./dealer-moulding-projection";

describe("dealer moulding office projection", () => {
	test("allocates exact office cents across selected products", () => {
		const result = buildDealerMouldingProjection({
			uid: "moulding",
			title: "Mouldings",
			itemIndex: 2,
			internalLineTotal: 0.05,
			meta: {
				mouldingRows: [0, 1, 2].map((index) => ({
					uid: `product-${index}`,
					title: "Casing",
					qty: 1,
					salesPrice: 0.02,
					lineTotal: 0.02,
				})),
			},
			formSteps: [
				{ stepId: 1, componentId: 883, prodUid: "5DcsP", value: "Mouldings" },
				{ stepId: 215, componentId: 888, prodUid: "product-0" },
				{ stepId: 217 },
			],
		});
		expect(result?.items.map((row) => row.item.total)).toEqual([
			0.02, 0.02, 0.01,
		]);
		expect(result?.items.map((row) => row.item.multiDyke)).toEqual([
			true,
			false,
			false,
		]);
		expect(result?.items[0]?.item.meta).toMatchObject({
			meta: { itemIndex: 2 },
		});
		expect(result?.formSteps.map((step) => step.stepId)).toEqual([1, 215, 217]);
	});
	test("keeps a custom moulding price as an office override", () => {
		const result = buildDealerMouldingProjection({
			uid: "moulding",
			internalLineTotal: 36.46,
			itemIndex: 0,
			meta: {
				mouldingRows: [
					{
						uid: "casing",
						title: "Casing",
						qty: 3,
						salesPrice: 15.19,
						customPrice: 15.19,
						basePrice: 7.9,
						lineTotal: 45.57,
					},
				],
			},
			formSteps: [
				{
					stepId: 215,
					meta: { selectedComponents: [{ uid: "casing", id: 888 }] },
				},
			],
		});
		expect(result?.items[0]?.housePackageTool).toMatchObject({
			stepProductId: 888,
			totalPrice: 36.46,
			meta: {
				priceTags: {
					moulding: {
						overridePrice: 12.15,
						basePrice: 7.9,
						dealerOfficeTotal: { qty: 3, unitPrice: 12.15, totalPrice: 36.46 },
					},
				},
			},
		});
	});
});
