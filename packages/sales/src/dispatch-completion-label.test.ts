import { expect, test } from "bun:test";
import {
	getSalesPipelineFilterHeadlines,
	matchesCanonicalSalesPipelineFilter,
	type SalesPipelineSnapshot,
	getSalesPipelineFulfillmentStateLabel,
	getSalesPipelineProductionStateLabel,
} from "./sales-pipeline";

test("status-only milestones use Completed without renaming stored states", () => {
	expect(
		getSalesPipelineFulfillmentStateLabel("administratively_completed"),
	).toBe("Completed");
	expect(
		getSalesPipelineProductionStateLabel("administratively_completed"),
	).toBe("Completed");
	expect(getSalesPipelineFulfillmentStateLabel("fulfilled")).toBe("Completed");
	expect(getSalesPipelineProductionStateLabel("completed")).toBe("Completed");
});

test("Completed filtering groups both methods without changing stored codes", () => {
	expect(getSalesPipelineFilterHeadlines(["fulfilled"])).toEqual([
		"fulfilled",
		"administratively_completed",
	]);
	expect(
		getSalesPipelineFilterHeadlines(["administratively_completed"]),
	).toEqual(["administratively_completed"]);
	for (const code of ["fulfilled", "administratively_completed"] as const) {
		const snapshot = {
			headline: { code },
			production: { state: "completed", applicability: "required" },
			fulfillment: { state: "fulfilled", applicability: "required" },
			evidence: { production: { assignments: [] } },
		} as unknown as SalesPipelineSnapshot;
		expect(
			matchesCanonicalSalesPipelineFilter(
				snapshot,
				{ headlines: ["fulfilled"] },
				"2026-09-08",
			),
		).toBe(true);
		expect(snapshot.headline.code).toBe(code);
	}
});
