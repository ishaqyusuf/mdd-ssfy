import { describe, expect, test } from "bun:test";
import {
	collectCanonicalDoorSizes,
	projectMainShelfCategories,
	readCatalogShippingWeight,
} from "./storefront-shipping-settings";

describe("storefront shipping settings projections", () => {
	test("projects every configured width across canonical door heights", () => {
		const sizes = collectCanonicalDoorSizes(
			[
				{
					title: "Door",
					meta: {
						doorSizeVariation: [
							{ widthList: ["3-0", "2-8"] },
							{ widthList: ["2-8", "2-6"] },
						],
					},
					components: [],
				},
				{
					title: "Height",
					meta: {},
					components: [{ title: "8-0" }, { title: "6-8" }],
				},
			],
			["3-6 x 7-0", "3-0 x 6-8 & supplier-1"],
		);

		expect(sizes).toEqual([
			"2-6 x 6-8",
			"2-6 x 8-0",
			"2-8 x 6-8",
			"2-8 x 8-0",
			"3-0 x 6-8",
			"3-0 x 8-0",
			"3-6 x 7-0",
		]);
	});

	test("returns only active main shelf categories", () => {
		expect(
			projectMainShelfCategories([
				{ id: 1, name: "Doors", type: "parent", parentCategoryId: null },
				{ id: 2, name: "Hinges", type: "child", parentCategoryId: 1 },
				{ id: 3, name: "  ", type: "parent", parentCategoryId: null },
			]),
		).toEqual([{ id: 1, name: "Doors" }]);
	});

	test("applies variation rules when projecting possible dimensions", () => {
		expect(
			collectCanonicalDoorSizes([
				{
					uid: "door-step",
					title: "Door",
					meta: {
						doorSizeVariation: [
							{
								widthList: ["4-0"],
								rules: [
									{
										stepUid: "height-step",
										operator: "is",
										componentsUid: ["height-8"],
									},
								],
							},
							{
								widthList: ["9-0"],
								rules: [
									{
										stepUid: "type-step",
										operator: "is",
										componentsUid: ["missing-type"],
									},
								],
							},
						],
					},
					components: [],
				},
				{
					uid: "height-step",
					title: "Height",
					components: [
						{ uid: "height-6", title: "6-8" },
						{ uid: "height-8", title: "8-0" },
					],
				},
				{
					uid: "type-step",
					title: "Door type",
					components: [{ uid: "available-type", title: "Single" }],
				},
			]),
		).toEqual(["4-0 x 8-0"]);
	});

	test("reads family-specific catalog weight overrides", () => {
		const metadata = {
			shipping: {
				weightPerUnitLb: 82,
				lbPerLinearFoot: 0.75,
				shelfCategoryId: 68,
			},
		};

		expect(readCatalogShippingWeight(metadata, "doors")).toEqual({
			weightPerUnitLb: 82,
			lbPerLinearFoot: null,
			shelfCategoryId: null,
		});
		expect(readCatalogShippingWeight(metadata, "mouldings")).toEqual({
			weightPerUnitLb: null,
			lbPerLinearFoot: 0.75,
			shelfCategoryId: null,
		});
		expect(readCatalogShippingWeight(metadata, "shelf-items")).toEqual({
			weightPerUnitLb: 82,
			lbPerLinearFoot: null,
			shelfCategoryId: 68,
		});
	});
});
