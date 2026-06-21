import { describe, expect, it } from "bun:test";
import {
	getDoorRouteConfig,
	getMobileDoorRouteFlags,
	getSelectedDoorComponents,
	mapWorkflowComponent,
} from "./line-workflow-helpers";

describe("mobile line workflow helpers", () => {
	it("reads selected door components from string step metadata", () => {
		const steps = [
			{
				step: { title: "Door" },
				meta: JSON.stringify({
					selectedComponents: [
						{
							uid: "door-json",
							title: "Door JSON",
						},
					],
				}),
			},
		] as any;

		expect(getSelectedDoorComponents(steps).map((door) => door.uid)).toEqual([
			"door-json",
		]);
	});

	it("merges stored route config with selected door overrides from string metadata", () => {
		const steps = [
			{
				step: { title: "Item Type" },
				prodUid: "root-door",
			},
			{
				step: { title: "Door" },
				meta: JSON.stringify({
					selectedComponents: [
						{
							uid: "door-json",
							title: "Door JSON",
							sectionOverride: {
								overrideMode: true,
								noHandle: true,
								hasSwing: false,
							},
						},
					],
				}),
			},
		] as any;
		const config = getDoorRouteConfig(
			{
				formSteps: steps,
				meta: JSON.stringify({
					workflowDoorRouteConfig: {
						noHandle: false,
						hasSwing: true,
					},
				}),
			} as any,
			steps,
		);

		expect(config).toEqual({
			noHandle: true,
			hasSwing: false,
		});
	});

	it("maps workflow components without leaking uid-like titles", () => {
		expect(
			mapWorkflowComponent({
				id: 101,
				uid: "workflow-door-package",
				title: "workflow-door-package",
				value: "Door package",
			}),
		).toMatchObject({
			uid: "workflow-door-package",
			title: "Door package",
		});
	});

	it("normalizes mobile door route flags like the website HPT panel", () => {
		expect(getMobileDoorRouteFlags(null)).toEqual({
			noHandle: false,
			hasSwing: false,
		});
		expect(getMobileDoorRouteFlags({ noHandle: true })).toEqual({
			noHandle: true,
			hasSwing: false,
		});
		expect(getMobileDoorRouteFlags({ hasSwing: true })).toEqual({
			noHandle: false,
			hasSwing: true,
		});
		expect(
			getMobileDoorRouteFlags({ noHandle: "true", hasSwing: 1 } as any),
		).toEqual({
			noHandle: false,
			hasSwing: false,
		});
	});
});
