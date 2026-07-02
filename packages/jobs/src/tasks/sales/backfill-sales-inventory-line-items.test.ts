import { describe, expect, test } from "bun:test";

import { getBackfillSalesInventoryLineItemsTake } from "./backfill-sales-inventory-line-items";

describe("getBackfillSalesInventoryLineItemsTake", () => {
	test("uses the explicit id count for targeted backfills", () => {
		expect(
			getBackfillSalesInventoryLineItemsTake({
				salesOrderIds: Array.from({ length: 75 }, (_, index) => index + 1),
				batchSize: 10,
			}),
		).toBe(75);
	});

	test("uses batch size for cursor-based backfills", () => {
		expect(
			getBackfillSalesInventoryLineItemsTake({
				batchSize: 25,
			}),
		).toBe(25);
	});
});
