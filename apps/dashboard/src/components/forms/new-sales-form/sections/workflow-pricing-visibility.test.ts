import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
	hasVisibleWorkflowComponentPrice,
	supportsWorkflowComponentPrice,
} from "./workflow-pricing-visibility";

describe("workflow component price visibility", () => {
	it("hides prices when every component in the step is unpriced", () => {
		expect(
			hasVisibleWorkflowComponentPrice([
				{ basePrice: null, salesPrice: null },
				{ basePrice: 0, salesPrice: 0 },
			]),
		).toBe(false);
	});

	it("shows prices when at least one component has a sales or base price", () => {
		expect(
			hasVisibleWorkflowComponentPrice([
				{ basePrice: 0, salesPrice: 0 },
				{ basePrice: 0, salesPrice: 12.5 },
			]),
		).toBe(true);
		expect(
			hasVisibleWorkflowComponentPrice([{ basePrice: 8, salesPrice: 0 }]),
		).toBe(true);
	});

	it("keeps custom price entry available for zero-priced pricing steps", () => {
		expect(
			supportsWorkflowComponentPrice([{ basePrice: 0, salesPrice: 0 }]),
		).toBe(true);
		expect(supportsWorkflowComponentPrice([{ pricing: { default: {} } }])).toBe(
			true,
		);
		expect(supportsWorkflowComponentPrice([{}])).toBe(false);
	});

	it("applies the all-step price check to root and routed component grids", () => {
		const panelSource = readFileSync(
			new URL("./item-workflow-panel.tsx", import.meta.url),
			"utf8",
		);

		expect(panelSource.includes("showRootComponentPrices")).toBe(true);
		expect(panelSource.includes("showActiveStepComponentPrices")).toBe(true);
		expect(
			panelSource.match(/hasVisibleWorkflowComponentPrice/g)?.length,
		).toBeGreaterThanOrEqual(3);
	});
});
