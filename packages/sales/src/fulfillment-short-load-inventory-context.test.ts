import { expect, test } from "bun:test";
import { getShortLoadInventoryContext } from "./fulfillment-short-load-inventory-context";

test("converts finished-item packing to component units before retaining inventory", async () => {
	const db = {
		stockAllocation: {
			findMany: async () => [{ id: 7, lineItemComponentId: 1 }],
		},
		orderItemDelivery: {
			findMany: async () => [{ orderItemId: 1, qty: 3, lhQty: 0, rhQty: 0 }],
		},
		lineItemComponents: {
			findMany: async () => [
				{
					id: 1,
					qty: 10,
					status: "completed",
					parent: { qty: 5, salesItemId: 1 },
					stockAllocations: [{ id: 7, qty: 10, status: "picked" }],
				},
			],
		},
	};
	const result = await getShortLoadInventoryContext(db as never, {
		salesId: 1,
		fulfillmentId: 2,
	});
	expect(result.components[0]?.packedRequirement).toBe(6);
	expect(result.releases).toEqual([
		{ allocationId: 7, qty: 4, requiresPhysicalReturn: true },
	]);
	expect(result.revision).toHaveLength(64);
});

test("rejects bound allocations missing from this order's component ownership", async () => {
	const db = {
		orderItemDelivery: { findMany: async () => [] },
		lineItemComponents: { findMany: async () => [] },
		stockAllocation: {
			findMany: async () => [{ id: 7, lineItemComponentId: 999 }],
		},
	};
	await expect(
		getShortLoadInventoryContext(db as never, { salesId: 1, fulfillmentId: 2 }),
	).rejects.toThrow("inventory links");
});

test("refuses missing component conversions", async () => {
	const db = {
		orderItemDelivery: { findMany: async () => [] },
		lineItemComponents: {
			findMany: async () => [
				{
					id: 1,
					qty: 10,
					status: "pending",
					parent: { qty: null, salesItemId: 1 },
					stockAllocations: [],
				},
			],
		},
	};
	await expect(
		getShortLoadInventoryContext(db as never, { salesId: 1, fulfillmentId: 2 }),
	).rejects.toThrow("conversion");
});
