import { describe, expect, it } from "bun:test";
import { resolveWorkflowVisibleComponents } from "./workflow-visible-components";

describe("workflow visible components", () => {
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
