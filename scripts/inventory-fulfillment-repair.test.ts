import { describe, expect, it } from "bun:test";

import { parseArgs } from "./inventory-fulfillment-repair";

describe("inventory fulfillment repair CLI", () => {
	it("defaults to a read-only unbounded review", () => {
		expect(parseArgs([])).toEqual({
			apply: false,
			confirmReview: false,
			json: false,
			salesOrderIds: null,
		});
	});

	it("requires explicit reviewed ids for apply mode", () => {
		expect(() => parseArgs(["--apply", "--confirm-review"])).toThrow(
			"--sales-order-ids",
		);
		expect(
			parseArgs(["--apply", "--confirm-review", "--sales-order-ids=8,3,8"]),
		).toMatchObject({
			apply: true,
			salesOrderIds: [3, 8],
		});
	});
});
