import { describe, expect, it } from "bun:test";
import {
	buildStepComponentOverrideMap,
	hasWorkflowStepSelection,
	isWorkflowComponentSelected,
	resolveInitialWorkflowStepIndex,
	workflowStepSelectionLabel,
} from "./workflow-records";

describe("workflow active step resolution", () => {
	it("defaults completed routes to the last step", () => {
		const steps = [
			{
				prodUid: "door-root",
				step: { title: "Item Type" },
				meta: {},
			},
			{
				prodUid: "height-80",
				step: { title: "Height" },
				meta: {},
			},
			{
				prodUid: "line-item",
				step: { title: "Line Item" },
				meta: {},
			},
		];

		expect(resolveInitialWorkflowStepIndex(steps)).toBe(2);
	});

	it("prefers the last interactive step even when prior steps are incomplete", () => {
		const steps = [
			{
				prodUid: "door-root",
				step: { title: "Item Type" },
				meta: {},
			},
			{
				prodUid: "",
				step: { title: "Height" },
				meta: {},
			},
			{
				prodUid: "",
				step: { title: "Width" },
				meta: {},
			},
		];

		expect(resolveInitialWorkflowStepIndex(steps)).toBe(2);
	});

	it("skips redirect-disabled steps when resolving the initial active step", () => {
		const steps = [
			{
				prodUid: "door-root",
				step: { title: "Item Type" },
				meta: {},
			},
			{
				prodUid: "",
				step: { title: "Door Type" },
				meta: { redirectDisabled: true },
			},
			{
				prodUid: "",
				step: { title: "Door" },
				meta: {},
			},
		];

		expect(resolveInitialWorkflowStepIndex(steps)).toBe(2);
	});

	it("falls back to the only available line-item step", () => {
		const steps = [
			{
				prodUid: "line-item",
				step: { title: "Line Item" },
				meta: {},
			},
		];

		expect(resolveInitialWorkflowStepIndex(steps)).toBe(0);
	});

	it("reads workflow selection state from JSON step metadata", () => {
		const step = {
			prodUid: "",
			meta: JSON.stringify({
				selectedProdUids: ["door-a"],
				selectedComponents: [
					{
						uid: "door-b",
						title: "Door B",
					},
				],
			}),
		};

		expect(isWorkflowComponentSelected(step as any, { uid: "door-a" })).toBe(
			true,
		);
		expect(isWorkflowComponentSelected(step as any, { uid: "door-b" })).toBe(
			true,
		);
		expect(hasWorkflowStepSelection(step as any)).toBe(true);
		expect(workflowStepSelectionLabel(step as any)).toBe("Door B");
	});

	it("does not use selected component uid as visible workflow selection copy", () => {
		const step = {
			meta: {
				selectedComponents: [
					{
						uid: "workflow-door-package",
						title: "workflow-door-package",
						value: "Door package",
					},
				],
			},
		};

		expect(workflowStepSelectionLabel(step as any)).toBe("Door package");
	});

	it("falls back to step titles instead of uid-like selected values", () => {
		const step = {
			prodUid: "workflow-door-package",
			value: "workflow-door-package",
			step: { title: "Door" },
		};

		expect(workflowStepSelectionLabel(step as any)).toBe("Door");
	});

	it("builds component override maps from JSON step metadata", () => {
		const overrides = buildStepComponentOverrideMap({
			prodUid: "custom-a",
			value: "Custom A",
			price: 25,
			basePrice: 20,
			custom: false,
			meta: JSON.stringify({
				custom: true,
				redirectUid: "next-step",
				sectionOverride: {
					overrideMode: true,
					noHandle: true,
				},
			}),
		} as any);

		expect(overrides.get("custom-a")).toEqual(
			expect.objectContaining({
				uid: "custom-a",
				title: "Custom A",
				redirectUid: "next-step",
				sectionOverride: {
					overrideMode: true,
					noHandle: true,
				},
				custom: true,
			}),
		);
	});
});
