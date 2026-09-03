import { describe, expect, it } from "bun:test";

import { measureCanonicalSalesOrderQueries } from "./sales-pipeline-query-benchmark";

describe("canonical Sales Orders query benchmark", () => {
	it("measures every list, count, and summary call after warmup", async () => {
		let clock = 0;
		const calls: string[] = [];
		const result = await measureCanonicalSalesOrderQueries({
			cases: [{ name: "pending", query: { production: "pending" } }],
			warmupRuns: 1,
			measuredRuns: 2,
			thresholdMs: 25,
			dependencies: {
				now: () => clock,
				run: async (surface) => {
					calls.push(surface);
					clock += surface === "list" ? 20 : 10;
				},
			},
		});

		expect(calls).toHaveLength(9);
		expect(result.samples).toHaveLength(6);
		expect(result.p95LatencyMs).toBe(20);
		expect(result.acceptable).toBe(true);
	});
});
