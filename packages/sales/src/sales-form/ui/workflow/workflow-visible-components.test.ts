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
});
