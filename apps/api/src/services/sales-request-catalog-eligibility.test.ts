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
