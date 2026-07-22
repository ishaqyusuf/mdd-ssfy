import { describe, expect, test } from "bun:test";
import { buildWorkflowComponentPricingVariants } from "./workflow-component-pricing-variants";

describe("workflow component admin pricing variants", () => {
	test("generates dependency buckets and highlights the current combination", () => {
		const variants = buildWorkflowComponentPricingVariants({
			routeData: {
				stepsByUid: {
					color: {
						uid: "color",
						title: "Color",
						components: [
							{ uid: "white", title: "White" },
							{ uid: "black", title: "Black" },
						],
					},
					size: {
						uid: "size",
						title: "Size",
						components: [
							{ uid: "small", title: "Small" },
							{ uid: "large", title: "Large" },
						],
					},
				},
			},
			line: {
				uid: "line-1",
				formSteps: [{ prodUid: "black" }, { prodUid: "large" }],
			},
			steps: [],
			step: {},
			stepIndex: 0,
			component: {
				id: 1,
				uid: "component",
				priceStepDeps: ["color", "size"],
				pricing: {
					"black-large": { id: 9, price: 85 },
				},
			},
		} as never);

		expect(variants.length).toBe(4);
		const current = variants.find((variant) => variant.current);
		expect(current?.path).toBe("black-large");
		expect(current?.id).toBe(9);
		expect(current?.price).toBe("85");
	});
});
