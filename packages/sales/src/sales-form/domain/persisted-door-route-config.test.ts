import { describe, expect, test } from "bun:test";
import { resolvePersistedSalesLineDoorRouteConfig } from "./persisted-door-route-config";

describe("persisted sales line door route config", () => {
	test("reads legacy step and component overrides in persisted order", () => {
		expect(
			resolvePersistedSalesLineDoorRouteConfig({
				formSteps: [
					{
						meta: {
							sectionOverride: {
								overrideMode: true,
								noHandle: false,
							},
						},
						component: {
							meta: {
								sectionOverride: {
									overrideMode: true,
									noHandle: true,
								},
							},
						},
					},
				],
			}),
		).toEqual({
			noHandle: true,
		});
	});

	test("treats the saved line route config as authoritative", () => {
		expect(
			resolvePersistedSalesLineDoorRouteConfig({
				meta: {
					workflowDoorRouteConfig: {
						noHandle: false,
						hasSwing: true,
					},
				},
				formSteps: [
					{
						component: {
							meta: {
								sectionOverride: {
									overrideMode: true,
									noHandle: true,
								},
							},
						},
					},
				],
			}),
		).toEqual({
			noHandle: false,
			hasSwing: true,
		});
	});
});
