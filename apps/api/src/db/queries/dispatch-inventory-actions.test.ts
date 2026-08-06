import { describe, expect, test } from "bun:test";

import { buildDispatchInventoryAllocationSelections } from "./dispatch-inventory-actions";

describe("buildDispatchInventoryAllocationSelections", () => {
	test("selects exact quantities without binding stock needed by another trip", () => {
		const result = buildDispatchInventoryAllocationSelections([
			{
				salesItemId: 1,
				components: [
					{
						id: 10,
						required: true,
						requiredQty: 3,
						allocations: [{ id: 4, qty: 1, status: "reserved" }],
						availableAllocations: [{ id: 5, qty: 5 }],
					},
				],
			},
		]);

		expect(result).toEqual({
			selections: [{ allocationId: 5, qty: 2 }],
			blockingComponents: [],
		});
	});

	test("reports shortages before mutating any allocation", () => {
		const result = buildDispatchInventoryAllocationSelections([
			{
				salesItemId: 1,
				components: [
					{
						id: 10,
						required: true,
						requiredQty: 3,
						allocations: [],
						availableAllocations: [{ id: 5, qty: 1 }],
					},
				],
			},
		]);

		expect(result.blockingComponents).toEqual([
			{ componentId: 10, missingQty: 2 },
		]);
	});
});
