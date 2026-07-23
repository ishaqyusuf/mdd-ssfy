import { describe, expect, test } from "bun:test";
import {
	buildCartShippingLines,
	defaultStorefrontShippingPolicy,
	saveStorefrontShippingPolicy,
} from "./storefront-shipping";

const policy = {
	globalDoorWeightLb: null,
	globalMouldingLbPerLinearFoot: 0.4,
	globalShelfWeightPerUnitLb: null,
	doorWeightProfiles: [{ dimension: "3-0 x 6-8", weightLb: 80 }],
	mouldingWeightProfiles: [],
	shelfCategoryWeights: [{ categoryId: 68, weightPerUnitLb: 12 }],
	productWeightOverrides: [],
};

describe("storefront cart shipping projection", () => {
	test("uses canonical catalog family and Dyke shelf category identities", () => {
		const lines = buildCartShippingLines(
			[
				{
					id: "moulding-line",
					rootComponentUid: "moulding-1",
					quantity: 2,
					configuration: {
						title: "Trim",
						meta: {
							storefrontMoulding: {
								requestedLinearFeet: 20,
								pieceLengthFeet: 16,
								wastePercentage: 10,
							},
						},
					},
					offer: {
						sourceComponentUid: "moulding-1",
						category: {
							id: "storefront-trim",
							slug: "trim",
							title: "Trim",
						},
					},
				},
				{
					id: "shelf-line",
					rootComponentUid: "shelf-1",
					quantity: 3,
					configuration: { title: "Shelf hardware" },
					offer: {
						sourceComponentUid: "shelf-1",
						category: {
							id: "storefront-hardware",
							slug: "accessories",
							title: "Accessories",
						},
					},
				},
			],
			policy,
			new Map([
				[
					"moulding-1",
					{
						weightPerUnitLb: null,
						lbPerLinearFoot: 0.75,
						shelfCategoryId: null,
						family: "mouldings" as const,
					},
				],
				[
					"shelf-1",
					{
						weightPerUnitLb: null,
						lbPerLinearFoot: null,
						shelfCategoryId: 68,
						family: "shelf-items" as const,
					},
				],
			]),
		);

		expect(lines).toHaveLength(2);
		expect(lines[0]).toMatchObject({
			kind: "MOULDING",
			weights: { overrideLbPerLinearFoot: 0.75 },
		});
		expect(lines[1]).toMatchObject({
			kind: "SHELF",
			weights: { childCategoryWeightPerUnitLb: 12 },
		});
	});

	test("keeps catalog Door weight ahead of the size default", () => {
		const lines = buildCartShippingLines(
			[
				{
					id: "door-line",
					rootComponentUid: "door-1",
					quantity: 1,
					configuration: {
						title: "Door",
						housePackageTool: {
							doors: [
								{
									dimension: "3-0 x 6-8",
									totalQty: 2,
									meta: { storefrontComponentUid: "door-1" },
								},
							],
						},
					},
					offer: null,
				},
			],
			policy,
			new Map([
				[
					"door-1",
					{
						weightPerUnitLb: 95,
						lbPerLinearFoot: null,
						shelfCategoryId: null,
						family: "doors" as const,
					},
				],
			]),
		);

		expect(lines[0]).toMatchObject({
			kind: "DOOR",
			weights: { overrideWeightLb: 95, profileWeightLb: 80 },
		});
	});

	test("blocks replacement of duplicate legacy mappings without acknowledgement", async () => {
		const db = {
			storefrontShippingPolicy: {
				aggregate: async () => ({ _max: { version: 3 } }),
				findFirst: async () => ({
					globalDoorWeightLb: null,
					globalShelfWeightPerUnitLb: null,
					doorWeightProfiles: [],
					mouldingWeightProfiles: [],
					shelfCategoryWeights: [
						{ categoryId: 68, weightPerUnitLb: 10 },
						{ categoryId: "068", weightPerUnitLb: 12 },
					],
					productWeightOverrides: [],
				}),
			},
			dykeShelfCategories: {
				findMany: async () => [{ id: 68 }],
			},
		};

		let message = "";
		try {
			await saveStorefrontShippingPolicy(
				{ db } as never,
				defaultStorefrontShippingPolicy,
			);
		} catch (error) {
			message = error instanceof Error ? error.message : String(error);
		}

		expect(message).toContain("Acknowledge the legacy weight configuration");
	});
});
