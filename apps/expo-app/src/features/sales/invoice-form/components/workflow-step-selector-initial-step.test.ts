import { describe, expect, it } from "bun:test";
import { getWorkflowInitialStepIndex } from "./workflow-step-initial-step";

describe("workflow selector initial step", () => {
	const steps = [
		{ step: { title: "Item Type" }, prodUid: "root" },
		{ step: { title: "Door" }, prodUid: "door-a" },
		{ step: { title: "Line Item" }, prodUid: "line-item" },
	];

	it("keeps inline create workflows on the first pill by default", () => {
		expect(getWorkflowInitialStepIndex({ steps, presentation: "inline" })).toBe(
			0,
		);
	});

	it("opens edit workflows on the last pill when requested", () => {
		expect(
			getWorkflowInitialStepIndex({
				steps,
				presentation: "inline",
				preference: "last",
			}),
		).toBe(2);
	});

	it("uses the last interactive pill when the final step is redirected", () => {
		expect(
			getWorkflowInitialStepIndex({
				steps: [
					steps[0],
					steps[1],
					{ ...steps[2], meta: { redirectDisabled: true } },
				],
				presentation: "inline",
				preference: "last",
			}),
		).toBe(1);
	});
});
