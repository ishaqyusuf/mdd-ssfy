import { describe, expect, it } from "bun:test";
import { buildInstallCostSuggestionsWhere } from "./install-cost-suggestions";

describe("buildInstallCostSuggestionsWhere", () => {
	it("filters out only costs already attached to the current builder task", () => {
		expect(buildInstallCostSuggestionsWhere(42)).toEqual({
			status: "active",
			builderTaskInstallCosts: {
				none: {
					builderTaskId: 42,
				},
			},
		});
	});

	it("does not exclude costs merely because they were used on the same model", () => {
		const where = buildInstallCostSuggestionsWhere(7);
		expect(where).not.toHaveProperty("communityModelInstallTasks");
	});

	it("does not exclude costs merely because they were used on another builder task", () => {
		const where = buildInstallCostSuggestionsWhere(9);
		expect(where.builderTaskInstallCosts).toEqual({
			none: {
				builderTaskId: 9,
			},
		});
	});
});
