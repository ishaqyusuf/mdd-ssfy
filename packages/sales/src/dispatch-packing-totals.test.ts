import { describe, expect, test } from "bun:test";

import {
	isCurrentDispatchPackingAllocation,
	resolveDispatchPackingTotals,
} from "./dispatch-packing-totals";

describe("dispatch packing totals", () => {
	test("uses ordered quantity before a dispatch has packing rows", () => {
		expect(
			resolveDispatchPackingTotals({ ordered: 53, listed: 0, packed: 0 }),
		).toEqual({ packed: 0, pending: 53, total: 53 });
	});

	test("uses listed dispatch quantity after packing begins", () => {
		expect(
			resolveDispatchPackingTotals({ ordered: 19, listed: 21, packed: 19 }),
		).toEqual({ packed: 19, pending: 2, total: 21 });
	});

	test("never reports a denominator below the packed quantity", () => {
		expect(
			resolveDispatchPackingTotals({ ordered: 0, listed: 0, packed: 7 }),
		).toEqual({ packed: 7, pending: 0, total: 7 });
	});

	test("does not count unpacked audit rows as current listed quantity", () => {
		expect(
			isCurrentDispatchPackingAllocation({ packingStatus: "packed" }),
		).toBe(true);
		expect(isCurrentDispatchPackingAllocation({ packingStatus: null })).toBe(
			true,
		);
		expect(
			isCurrentDispatchPackingAllocation({ packingStatus: "unpacked" }),
		).toBe(false);
	});
});
