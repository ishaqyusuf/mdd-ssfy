import { describe, expect, it } from "bun:test";
import { resolveInitialWorkflowStepIndex } from "./workflow-records";

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
});
