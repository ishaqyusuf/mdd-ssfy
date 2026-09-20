import { describe, expect, it } from "bun:test";
import {
	resolveWorkflowCatalogComponents,
	resolveWorkflowVisibleComponents,
} from "./workflow-visible-components";

describe("workflow visible components", () => {
	it("classifies default, custom, and hidden catalog components without deleted rows", () => {
		const components = resolveWorkflowCatalogComponents({
			components: [
				{ uid: "default", title: "Default" },
				{
					uid: "hidden",
					title: "Hidden",
					variations: [
						{
							rules: [
								{
									stepUid: "color",
									operator: "is",
									componentsUid: ["black"],
								},
							],
						},
					],
				},
				{ uid: "custom", title: "Custom", custom: true },
				{ uid: "deleted", title: "Deleted", isDeleted: true },
				{
					uid: "metadata-deleted",
					title: "Metadata deleted",
					_metaData: { deletedAt: "2026-08-20T00:00:00.000Z" },
				},
			],
			steps: [
				{
					step: { uid: "color" },
					prodUid: "white",
				},
			],
			activeStep: null,
			overrides: new Map(),
			profileCoefficient: 1,
		});

		expect(
			components.map((component) => ({
				uid: component.uid,
				custom: component._metaData?.custom,
				visible: component._metaData?.visible,
			})),
		).toEqual([
			{ uid: "default", custom: false, visible: true },
			{ uid: "hidden", custom: false, visible: false },
			{ uid: "custom", custom: true, visible: true },
		]);
	});

	it("filters deleted components and applies profile-adjusted pricing", () => {
		const components = resolveWorkflowVisibleComponents({
			components: [
				{
					uid: "visible",
					title: "Visible",
					salesPrice: 20,
					basePrice: 10,
				},
				{
					uid: "deleted",
					title: "Deleted",
					isDeleted: true,
					salesPrice: 20,
					basePrice: 10,
				},
			],
			steps: [],
			activeStep: null,
			overrides: new Map(),
			includeCustomComponents: true,
			profileCoefficient: 2,
		});

		expect(components).toHaveLength(1);
		expect(components[0]?.uid).toBe("visible");
		expect(components[0]?.salesPrice).toBe(5);
		expect(components[0]?.basePrice).toBe(10);
	});

	it("applies dealer percentage when resolving dealer view component prices", () => {
		const components = resolveWorkflowVisibleComponents({
			components: [
				{
					uid: "dealer-visible",
					title: "Dealer Visible",
					salesPrice: 20,
					basePrice: 10,
				},
			],
			steps: [],
			activeStep: null,
			overrides: new Map(),
			includeCustomComponents: true,
			profileCoefficient: 2,
			pricingView: "dealer",
			dealerSalesPercentage: 20,
		});

		expect(components[0]?.salesPrice).toBe(6);
	});

	it("distinguishes an unpriced component from an intentional zero-price component", () => {
		const components = resolveWorkflowCatalogComponents({
			components: [
				{ uid: "missing", title: "Missing", salesPrice: null, basePrice: null },
				{ uid: "free", title: "Free", salesPrice: 0, basePrice: 0 },
			],
			steps: [],
			activeStep: null,
			overrides: new Map(),
			profileCoefficient: 1,
		});

		expect(components[0]?._metaData?.priceMissing).toBe(true);
		expect(components[1]?._metaData?.priceMissing).toBe(false);
	});

	it("keeps current catalogue pricing when an edit snapshot has null pricing", () => {
		const components = resolveWorkflowVisibleComponents({
			components: [
				{
					id: 978,
					uid: "door-edit",
					title: "Current Door",
					pricing: { "3-0 x 6-8": { price: 92.56 } },
				},
			],
			steps: [],
			activeStep: null,
			overrides: new Map([
				[
					"door-edit",
					{
						id: 978,
						uid: "door-edit",
						title: "Saved Door",
						pricing: null,
						supplierVariants: [],
					},
				],
			]),
			includeCustomComponents: false,
			profileCoefficient: 1,
		});

		expect(components[0]?.pricing).toEqual({
			"3-0 x 6-8": { price: 92.56 },
		});
	});

	it("lets current catalogue pricing replace stale saved door-price snapshots", () => {
		const components = resolveWorkflowVisibleComponents({
			components: [
				{
					id: 1120,
					uid: "door-edit",
					title: "Current Door",
					pricing: { "1-8 x 6-8": { id: 3220, price: 80.5 } },
				},
			],
			steps: [],
			activeStep: null,
			overrides: new Map([
				[
					"door-edit",
					{
						pricing: {
							"1-8 x 6-8": { id: 3219, price: 100 },
							"legacy-only": { id: 44, price: 20 },
						},
					},
				],
			]),
			includeCustomComponents: false,
			profileCoefficient: 1,
		});

		expect(components[0]?.pricing).toEqual({
			"1-8 x 6-8": { id: 3220, price: 80.5 },
			"legacy-only": { id: 44, price: 20 },
		});
	});

	it("uses the current dependency price instead of a retained selection snapshot", () => {
		const components = resolveWorkflowCatalogComponents({
			components: [
				{
					uid: "jamb-size-4-5-8",
					title: "4-5/8",
					pricing: {
						"interior-prehung-6-8-ph-single": { price: 21.75 },
					},
				},
			],
			steps: [
				{
					step: { uid: "item-type" },
					prodUid: "interior-prehung",
				},
				{
					step: { uid: "height" },
					prodUid: "6-8",
				},
				{
					step: { uid: "door-type" },
					prodUid: "ph-single",
				},
			],
			activeStep: {
				step: { uid: "jamb-size" },
				meta: {
					priceStepDeps: ["item-type", "height", "door-type"],
				},
			},
			overrides: new Map([
				[
					"jamb-size-4-5-8",
					{
						uid: "jamb-size-4-5-8",
						basePrice: 42.45,
						salesPrice: 56.6,
					},
				],
			]),
			profileCoefficient: 0.75,
		});

		expect(components[0]?.basePrice).toBe(21.75);
		expect(components[0]?.salesPrice).toBe(29);
	});

	it("uses current custom pricing and falls back to saved prices only when missing", () => {
		const components = resolveWorkflowCatalogComponents({
			components: [
				{ uid: "missing-price", title: "Missing Price" },
				{
					uid: "custom-price",
					title: "Custom Price",
					custom: true,
					basePrice: 10,
				},
				{ uid: "custom-missing", title: "Custom Missing", custom: true },
				{ uid: "custom-sale", title: "Custom Sale", custom: true, salesPrice: 12 },
			],
			steps: [],
			activeStep: null,
			overrides: new Map([
				["missing-price", { basePrice: 30 }],
				["custom-price", { basePrice: 45 }],
				["custom-missing", { basePrice: 20 }],
				["custom-sale", { basePrice: 45 }],
			]),
			profileCoefficient: 1,
		});

		expect(components[0]?.basePrice).toBe(30);
		expect(components[0]?.salesPrice).toBe(30);
		expect(components[1]?.basePrice).toBe(10);
		expect(components[1]?.salesPrice).toBe(10);
		expect(components[2]?.basePrice).toBe(20);
		expect(components[2]?.salesPrice).toBe(20);
		expect(components[3]?.basePrice).toBe(12);
		expect(components[3]?.salesPrice).toBe(12);
	});

	it("hides unselected custom components while keeping the selected custom component visible", () => {
		const components = resolveWorkflowVisibleComponents({
			components: [
				{
					uid: "selected-custom",
					title: "Selected Custom",
					custom: true,
					salesPrice: 10,
					basePrice: 10,
				},
				{
					uid: "other-custom",
					title: "Other Custom",
					custom: true,
					salesPrice: 20,
					basePrice: 20,
				},
				{
					uid: "standard",
					title: "Standard",
					salesPrice: 30,
					basePrice: 30,
				},
			],
			steps: [
				{
					prodUid: "selected-custom",
					step: {
						uid: "step-1",
					},
				},
			],
			activeStep: null,
			overrides: new Map(),
			includeCustomComponents: false,
			profileCoefficient: 1,
		});

		expect(components.map((component) => component.uid)).toEqual([
			"selected-custom",
			"standard",
		]);
	});

	it("treats string metadata custom components like object metadata", () => {
		const components = resolveWorkflowVisibleComponents({
			components: [
				{
					uid: "selected-custom",
					title: "Selected Custom",
					_metaData: JSON.stringify({ custom: true }) as any,
					salesPrice: 10,
					basePrice: 10,
				},
				{
					uid: "other-custom",
					title: "Other Custom",
					_metaData: JSON.stringify({ custom: true }) as any,
					salesPrice: 20,
					basePrice: 20,
				},
				{
					uid: "standard",
					title: "Standard",
					salesPrice: 30,
					basePrice: 30,
				},
			],
			steps: [
				{
					prodUid: "selected-custom",
					step: {
						uid: "step-1",
					},
				},
			],
			activeStep: null,
			overrides: new Map(),
			includeCustomComponents: false,
			profileCoefficient: 1,
		});

		expect(components.map((component) => component.uid)).toEqual([
			"selected-custom",
			"standard",
		]);
	});

	it("keeps selected custom components visible from string step metadata", () => {
		const components = resolveWorkflowVisibleComponents({
			components: [
				{
					uid: "selected-custom",
					title: "Selected Custom",
					_metaData: JSON.stringify({ custom: true }) as any,
					salesPrice: 10,
					basePrice: 10,
				},
				{
					uid: "other-custom",
					title: "Other Custom",
					_metaData: JSON.stringify({ custom: true }) as any,
					salesPrice: 20,
					basePrice: 20,
				},
				{
					uid: "standard",
					title: "Standard",
					salesPrice: 30,
					basePrice: 30,
				},
			],
			steps: [
				{
					step: {
						uid: "step-1",
					},
					meta: JSON.stringify({
						selectedProdUids: ["selected-custom"],
					}) as any,
				},
			],
			activeStep: null,
			overrides: new Map(),
			includeCustomComponents: false,
			profileCoefficient: 1,
		});

		expect(components.map((component) => component.uid)).toEqual([
			"selected-custom",
			"standard",
		]);
	});
});
