import { expect, it } from "bun:test";
import { resolveSalesTaskRowOutcomes } from "@/lib/table-row-activity/sales-outcomes";

it("only marks committed per-sale successes green in a completed mixed run", () => {
	const result = resolveSalesTaskRowOutcomes([1, 2, 3, 4, 5], {
		outcomes: [
			{ salesId: 1, status: "succeeded" },
			{ salesId: 2, status: "review_required" },
			{ salesId: 3, status: "failed" },
			{ salesId: 4, status: "already_fulfilled" },
		],
	});
	expect(result.map((item) => item.phase)).toEqual([
		"success",
		"review-required",
		"error",
		"unknown",
		"unknown",
	]);
});
