import { describe, expect, it } from "bun:test";

import {
	assertNoPendingPackingReports,
	lockAndAssertNoPendingPackingReports,
} from "./guard";

describe("pending packing report downstream hold", () => {
	it("blocks packing, trip start, loading, and completion while pending", async () => {
		await expect(
			assertNoPendingPackingReports(
				{
					salesPackingReport: {
						count: async () => 1,
					},
				} as Parameters<typeof assertNoPendingPackingReports>[0],
				{ dispatchId: 41, salesOrderId: 51 },
			),
		).rejects.toThrow("cannot start, load, or complete");
	});

	it("allows downstream commands when no report is pending", async () => {
		await expect(
			assertNoPendingPackingReports(
				{
					salesPackingReport: {
						count: async () => 0,
					},
				} as Parameters<typeof assertNoPendingPackingReports>[0],
				{ dispatchId: 41, salesOrderId: 51 },
			),
		).resolves.toBeUndefined();
	});

	it("locks the dispatch before checking the fail-closed hold", async () => {
		const calls: string[] = [];
		const db = {
			$queryRaw: async () => calls.push("lock"),
			salesPackingReport: {
				count: async () => {
					calls.push("hold");
					return 0;
				},
			},
		} as Parameters<typeof lockAndAssertNoPendingPackingReports>[0];
		await lockAndAssertNoPendingPackingReports(db, {
			dispatchId: 41,
			salesOrderId: 51,
		});
		expect(calls).toEqual(["lock", "hold"]);
	});

	it("fails closed when the packing-report model is unavailable", async () => {
		await expect(
			assertNoPendingPackingReports(
				{} as Parameters<typeof assertNoPendingPackingReports>[0],
				{
					dispatchId: 41,
					salesOrderId: 51,
				},
			),
		).rejects.toThrow();
	});
});
