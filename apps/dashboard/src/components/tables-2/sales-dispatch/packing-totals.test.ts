import { describe, expect, test } from "bun:test";
import { getDispatchPackingTotals } from "./packing-totals";

describe("dispatch table packing totals", () => {
	test("keeps duplicate-dispatch rows scoped to the current dispatch", () => {
		expect(
			getDispatchPackingTotals({
				control: {
					packed: { total: 0 },
					pendingPacking: { total: 34 },
				},
				order: {
					control: {
						packed: { total: 34 },
						pendingPacking: { total: 0 },
					},
				},
			}),
		).toEqual({ packed: 0, pending: 34, total: 34 });
	});

	test("falls back to order totals only when no dispatch projection exists", () => {
		expect(
			getDispatchPackingTotals({
				order: {
					control: {
						packed: { total: "5" },
						pendingPacking: { total: 2 },
					},
				},
			}),
		).toEqual({ packed: 5, pending: 2, total: 7 });
	});

	test("uses remaining order quantity when an unstarted dispatch has no packing rows", () => {
		expect(
			getDispatchPackingTotals({
				control: {
					packed: { total: 0 },
					pendingPacking: { total: 0 },
				},
				order: {
					control: {
						packed: { total: 0 },
						pendingPacking: { total: 53 },
					},
				},
			}),
		).toEqual({ packed: 0, pending: 53, total: 53 });
	});
});
