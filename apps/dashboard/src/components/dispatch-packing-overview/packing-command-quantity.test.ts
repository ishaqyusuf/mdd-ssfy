import { describe, expect, test } from "bun:test";

import { toPackingCommandQuantity } from "./packing-command-quantity";

describe("packing command quantity transport", () => {
	test("uses a single quantity for non-handed items", () => {
		expect(toPackingCommandQuantity({ qty: 12 })).toEqual({
			qty: 12,
			lh: 0,
			rh: 0,
		});
	});

	test("uses LH and RH without also sending their total", () => {
		expect(toPackingCommandQuantity({ qty: 4, lh: 3, rh: 1 })).toEqual({
			qty: 0,
			lh: 3,
			rh: 1,
		});
	});
});
