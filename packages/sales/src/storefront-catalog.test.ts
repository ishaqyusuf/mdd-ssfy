import { describe, expect, test } from "bun:test";
import {
	buildStorefrontCatalogProjection,
	deduplicateStorefrontCatalogProfiles,
	storefrontCatalogBasePrice,
	storefrontCatalogFamilyFromStepTitle,
	storefrontCatalogStepUidsFromSalesSettings,
} from "./storefront-catalog";

describe("storefrontCatalogFamilyFromStepTitle", () => {
	test("accepts only the exact sales-form catalog families", () => {
		expect(storefrontCatalogFamilyFromStepTitle("Door")).toBe("doors");
		expect(storefrontCatalogFamilyFromStepTitle("  Moulding ")).toBe(
			"mouldings",
		);
		expect(storefrontCatalogFamilyFromStepTitle("SHELF ITEMS")).toBe(
			"shelf-items",
		);
		expect(storefrontCatalogFamilyFromStepTitle("Door Type")).toBeNull();
		expect(
			storefrontCatalogFamilyFromStepTitle("Shelf Item Category"),
		).toBeNull();
		expect(storefrontCatalogFamilyFromStepTitle("Services")).toBeNull();
	});
});

describe("storefrontCatalogStepUidsFromSalesSettings", () => {
	test("returns deduplicated steps from the active sales-form route", () => {
		expect(
			storefrontCatalogStepUidsFromSalesSettings({
				route: {
					doors: {
						routeSequence: [{ uid: "door" }, { uid: "moulding" }],
					},
					shelf: {
						routeSequence: [{ uid: "door" }, { uid: "shelf-items" }],
					},
				},
			}),
		).toEqual(["door", "moulding", "shelf-items"]);
	});
});

describe("deduplicateStorefrontCatalogProfiles", () => {
	test("collapses spacing variants and retains the priced profile", () => {
		expect(
			deduplicateStorefrontCatalogProfiles([
				{ id: 5, title: "Tier 1", coefficient: null },
				{ id: 6, title: "Tier1", coefficient: null },
				{ id: 7, title: "Tier 1 65%", coefficient: 0.65 },
			]),
		).toEqual([{ id: 7, title: "Tier 1 65%", coefficient: 0.65 }]);
	});
});

describe("storefrontCatalogBasePrice", () => {
	test("uses the direct sales-form price when one exists", () => {
		expect(
			storefrontCatalogBasePrice("door-1", [
				{ stepProductUid: "door-1", dependenciesUid: "size-a", price: 90 },
				{ stepProductUid: "door-1", dependenciesUid: null, price: 120 },
			]),
		).toBe(120);
	});

	test("uses the lowest configured dependency price as the catalog baseline", () => {
		expect(
			storefrontCatalogBasePrice("door-1", [
				{ stepProductUid: "door-1", dependenciesUid: "size-a", price: 90 },
				{ stepProductUid: "door-1", dependenciesUid: "size-b", price: 75 },
				{ stepProductUid: "door-1", dependenciesUid: "size-c", price: 0 },
			]),
		).toBe(75);
	});
});

describe("buildStorefrontCatalogProjection", () => {
	test("deduplicates components by canonical uid and applies storefront overlays", () => {
		const projection = buildStorefrontCatalogProjection({
			steps: [
				{
					uid: "door-step-a",
					title: "Door",
					components: [
						{
							uid: "door-1",
							title: "2 Panel",
							img: "/default.jpg",
							basePrice: 80,
							salesPrice: 100,
						},
					],
				},
				{
					uid: "door-step-b",
					title: "Door",
					components: [
						{
							uid: "door-1",
							title: "Duplicate title",
							basePrice: 80,
							salesPrice: 100,
						},
					],
				},
				{
					uid: "door-type",
					title: "Door Type",
					components: [{ uid: "ignored", title: "Ignored" }],
				},
			],
			overlays: [
				{
					sourceComponentUid: "door-1",
					sourceStepUid: "door-step-a",
					title: "Storefront 2 Panel",
					imageUrl: "/override.jpg",
					availableOnStorefront: true,
					status: "PUBLISHED",
				},
			],
			offers: [
				{
					id: "offer-1",
					sourceComponentUid: "door-1",
					featured: true,
					status: "PUBLISHED",
				},
			],
			profileCoefficient: 0.8,
		});

		expect(projection.items).toHaveLength(1);
		expect(projection.items[0]).toMatchObject({
			uid: "door-1",
			family: "doors",
			title: "Storefront 2 Panel",
			imageUrl: "/override.jpg",
			online: true,
			featured: true,
			costPrice: 80,
			salesPrice: 100,
		});
		expect(projection.onlineCounts).toEqual({
			doors: 1,
			mouldings: 0,
			"shelf-items": 0,
		});
	});
});
