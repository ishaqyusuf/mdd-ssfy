import { describe, expect, it } from "bun:test";
import {
	applyWorkflowComponentPriceOverride,
	buildWorkflowComponentEditState,
	saveWorkflowComponentEdit,
} from "./workflow-component-edit-actions";

describe("workflow component edit actions", () => {
	it("builds edit state from selected component overrides", () => {
		const state = buildWorkflowComponentEditState({
			line: {
				uid: "line-1",
				formSteps: [
					{
						prodUid: "door-a",
						meta: {
							selectedComponents: [
								{
									uid: "door-a",
									title: "Door A",
									img: "door-a.png",
									salesPrice: 150,
									redirectUid: "next-step",
									sectionOverride: {
										overrideMode: true,
										noHandle: true,
										hasSwing: false,
									},
								},
							],
						},
					},
				],
			},
			stepIndex: 0,
			component: {
				uid: "door-a",
				title: "Door A",
				salesPrice: 100,
			},
		});

		expect(state?.componentUid).toBe("door-a");
		expect(state?.componentImg).toBe("door-a.png");
		expect(state?.salesPrice).toBe("150");
		expect(state?.redirectUid).toBe("next-step");
		expect(state?.overrideMode).toBe(true);
		expect(state?.noHandle).toBe(true);
		expect(state?.hasSwing).toBe(false);
	});

	it("builds edit state from JSON selected component metadata", () => {
		const state = buildWorkflowComponentEditState({
			line: {
				uid: "line-1",
				formSteps: [
					{
						prodUid: "door-a",
						meta: JSON.stringify({
							redirectUid: "fallback-step",
							selectedComponents: [
								{
									uid: "door-a",
									title: "Door A",
									img: "door-json.png",
									salesPrice: 150,
									redirectUid: "next-step",
									sectionOverride: {
										overrideMode: true,
										noHandle: true,
										hasSwing: false,
									},
								},
							],
						}),
					},
				],
			},
			stepIndex: 0,
			component: {
				uid: "door-a",
				title: "Door A",
				salesPrice: 100,
			},
		});

		expect(state?.componentImg).toBe("door-json.png");
		expect(state?.salesPrice).toBe("150");
		expect(state?.redirectUid).toBe("next-step");
		expect(state?.overrideMode).toBe(true);
		expect(state?.noHandle).toBe(true);
		expect(state?.hasSwing).toBe(false);
	});

	it("saves component edit patches to the selected step", () => {
		const patch = saveWorkflowComponentEdit({
			line: {
				uid: "line-1",
				formSteps: [
					{
						prodUid: "door-a",
						price: 100,
						meta: {
							selectedComponents: [
								{
									uid: "door-a",
									title: "Door A",
									salesPrice: 100,
								},
							],
						},
					},
				],
			},
			state: {
				open: true,
				mode: "edit",
				lineUid: "line-1",
				stepIndex: 0,
				componentUid: "door-a",
				componentTitle: "Door A",
				componentImg: "updated.png",
				salesPrice: "175",
				redirectUid: "next-step",
				overrideMode: true,
				noHandle: false,
				hasSwing: true,
			},
		});

		expect(patch?.formSteps[0]?.price).toBe(175);
		expect(patch?.formSteps[0]?.meta?.img).toBe("updated.png");
		expect(patch?.formSteps[0]?.meta?.redirectUid).toBe("next-step");
		expect(patch?.formSteps[0]?.meta?.selectedComponents?.[0]?.salesPrice).toBe(
			175,
		);
		expect(
			patch?.formSteps[0]?.meta?.selectedComponents?.[0]?.sectionOverride,
		).toEqual({
			overrideMode: true,
			noHandle: false,
			hasSwing: true,
		});
	});

	it("saves component edits without spreading JSON step metadata", () => {
		const patch = saveWorkflowComponentEdit({
			line: {
				uid: "line-1",
				formSteps: [
					{
						prodUid: "door-a",
						price: 100,
						meta: JSON.stringify({
							preserved: "yes",
							selectedComponents: [
								{
									uid: "door-a",
									title: "Door A",
									salesPrice: 100,
								},
							],
						}),
					},
				],
			},
			state: {
				open: true,
				mode: "edit",
				lineUid: "line-1",
				stepIndex: 0,
				componentUid: "door-a",
				componentTitle: "Door A",
				componentImg: "updated.png",
				salesPrice: "175",
				redirectUid: "next-step",
				overrideMode: true,
				noHandle: false,
				hasSwing: true,
			},
		});

		expect(patch?.formSteps[0]?.meta?.preserved).toBe("yes");
		expect(Object.keys((patch?.formSteps[0]?.meta || {}) as any)).not.toContain(
			"0",
		);
		expect(patch?.formSteps[0]?.meta?.selectedComponents?.[0]?.salesPrice).toBe(
			175,
		);
	});

	it("applies a quick price override without replacing base price", () => {
		const patch = applyWorkflowComponentPriceOverride({
			line: {
				uid: "line-1",
				formSteps: [
					{
						prodUid: "door-a",
						price: 100,
						basePrice: 80,
						meta: {
							selectedComponents: [
								{
									uid: "door-a",
									title: "Door A",
									salesPrice: 100,
									basePrice: 80,
								},
							],
						},
					},
				],
			},
			stepIndex: 0,
			component: {
				uid: "door-a",
				title: "Door A",
			},
			price: 125,
			fallbackBasePrice: 80,
		});

		expect(patch?.formSteps[0]?.price).toBe(125);
		expect(patch?.formSteps[0]?.basePrice).toBe(80);
		expect(patch?.formSteps[0]?.meta?.selectedComponents?.[0]?.salesPrice).toBe(
			125,
		);
		expect(patch?.formSteps[0]?.meta?.selectedComponents?.[0]?.basePrice).toBe(
			80,
		);
	});

	it("applies a quick price override from JSON selected component metadata", () => {
		const patch = applyWorkflowComponentPriceOverride({
			line: {
				uid: "line-1",
				formSteps: [
					{
						prodUid: "door-a",
						price: 100,
						basePrice: 80,
						meta: JSON.stringify({
							preserved: true,
							selectedComponents: [
								{
									uid: "door-a",
									title: "Door A",
									salesPrice: 100,
									basePrice: 80,
								},
							],
						}),
					},
				],
			},
			stepIndex: 0,
			component: {
				uid: "door-a",
				title: "Door A",
			},
			price: 125,
			fallbackBasePrice: 80,
		});

		expect(patch?.formSteps[0]?.price).toBe(125);
		expect(patch?.formSteps[0]?.basePrice).toBe(80);
		expect(patch?.formSteps[0]?.meta?.preserved).toBe(true);
		expect(Object.keys((patch?.formSteps[0]?.meta || {}) as any)).not.toContain(
			"0",
		);
		expect(patch?.formSteps[0]?.meta?.selectedComponents?.[0]?.salesPrice).toBe(
			125,
		);
	});
});
