import { describe, expect, it } from "bun:test";
import { selectSalesRequestCatalogCandidates } from "./sales-request-catalog-eligibility";

const policy = {
	gracePeriodDays: 90,
	pinnedComponentUids: [] as string[],
	excludedComponentUids: [] as string[],
};

function component(uid: string, overrides: Record<string, unknown> = {}) {
	return {
		id: uid.charCodeAt(0),
		uid,
		dykeStepId: 1,
		name: uid,
		meta: {},
		createdAt: "2020-01-01T00:00:00.000Z",
		metric: { selectionCount: 0 },
		...overrides,
	};
}

describe("sales request catalog eligibility", () => {
	it("retains unused heights and products without overriding explicit exclusions", () => {
		const result = selectSalesRequestCatalogCandidates({
			components: [
				component("height-6-8", { dykeStepId: 13, sortIndex: 0 }),
				component("height-8-0", { dykeStepId: 13, metric: null }),
				component("door-base", { dykeStepId: 51, sortIndex: 0 }),
				component("door-carrara", { dykeStepId: 51, metric: null }),
				component("door-excluded", { dykeStepId: 51 }),
				component("custom", { custom: true }),
			],
			includeUnused: true,
			defaultComponentUids: new Set(),
			policy: { ...policy, excludedComponentUids: ["door-excluded"] },
		});
		expect(result.components.map((entry) => entry.uid)).toEqual([
			"height-6-8", "height-8-0", "door-base", "door-carrara",
		]);
		expect(result.diagnostics.excludedUnused).toBe(0);
		expect(result.diagnostics.explicitExclusions).toBe(1);
	});
	it("keeps every active standard component for explicitly complete steps", () => {
		const result = selectSalesRequestCatalogCandidates({
			components: [
				component("ordinary-route", { dykeStepId: 1, sortIndex: 0 }),
				component("ordinary-unused", { dykeStepId: 1, sortIndex: 1 }),
				component("moulding-base", { dykeStepId: 215, sortIndex: 2 }),
				component("moulding-casing", { dykeStepId: 215, sortIndex: 1 }),
				component("moulding-custom", {
					dykeStepId: 215,
					custom: true,
					sortIndex: 0,
				}),
			],
			defaultComponentUids: new Set(),
			completeStepIds: new Set([215]),
			policy,
		});

		expect(result.components.map((entry) => entry.uid)).toEqual([
			"ordinary-route",
			"moulding-base",
			"moulding-casing",
		]);
		expect(result.diagnostics.completeStepInclusions).toBe(2);
	});

	it("keeps used, default, recent, pinned, and one deterministic route candidate", () => {
		const result = selectSalesRequestCatalogCandidates({
			components: [
				component("route", { sortIndex: 0 }),
				component("used", { metric: { selectionCount: 2 } }),
				component("default"),
				component("recent", { createdAt: "2026-09-01T00:00:00.000Z" }),
				component("pinned"),
				component("unused"),
				component("custom", { custom: true, metric: { selectionCount: 20 } }),
			],
			defaultComponentUids: new Set(["default"]),
			policy: { ...policy, pinnedComponentUids: ["pinned"] },
			now: new Date("2026-09-11T00:00:00.000Z"),
		});
		expect(result.components.map((entry) => entry.uid).sort()).toEqual([
			"default",
			"pinned",
			"recent",
			"route",
			"used",
		]);
		expect(result.diagnostics).toMatchObject({
			excludedCustom: 1,
			excludedUnused: 1,
			finalTupleCount: 5,
		});
	});

	it("adds transitive visibility dependencies", () => {
		const result = selectSalesRequestCatalogCandidates({
			components: [
				component("visible", {
					metric: { selectionCount: 1 },
					meta: {
						variations: [
							{
								rules: [
									{
										stepUid: "type",
										operator: "is",
										componentsUid: ["dependency"],
									},
								],
							},
						],
					},
				}),
				component("route-two", { dykeStepId: 2, sortIndex: 0 }),
				component("dependency", { dykeStepId: 2, sortIndex: 2 }),
			],
			defaultComponentUids: new Set(),
			policy,
		});
		expect(result.components.map((entry) => entry.uid)).toEqual([
			"visible",
			"route-two",
			"dependency",
		]);
		expect(result.diagnostics.dependencyClosureAdditions).toBe(1);
	});

	it("rejects an exclusion that would break a default or dependency", () => {
		expect(() =>
			selectSalesRequestCatalogCandidates({
				components: [component("required")],
				defaultComponentUids: new Set(["required"]),
				policy: { ...policy, excludedComponentUids: ["required"] },
			}),
		).toThrow("would remove required component required");
	});
});
