import { expect, test } from "bun:test";
import {
	buildSalesOverviewInventoryGroups,
	buildSalesOverviewInventoryMergedRows,
} from "./sales-inventory-overview";
test("partial receipt allocated to the same need is counted once in Inventory", () => {
	const rows = buildSalesOverviewInventoryMergedRows(
		buildSalesOverviewInventoryGroups([
			{
				id: 1,
				components: [
					{
						id: 1,
						required: true,
						qty: 10,
						qtyAllocated: 4,
						qtyReceived: 4,
						status: "partially_allocated",
						inventoryId: 1,
						inventoryVariantId: 1,
						inventory: {
							id: 1,
							name: "Door",
							stockMode: "monitored",
							productKind: "single",
						},
					},
				],
			},
		]),
	);
	expect(rows[0]?.qtyPending).toBe(6);
});
