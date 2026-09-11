import { expect, test } from "bun:test";
import { getShortLoadInventoryContext } from "./fulfillment-short-load-inventory-context";
import { reconcileShortLoadInventoryInTransaction } from "./fulfillment-short-load-inventory-execute";

function fixture() {
	let allocationQty = 10;
	let locks = 0;
	let writes = 0;
	const tx = {
		$queryRaw: async () => { locks++; return []; },
		orderItemDelivery: {
			findMany: async () => [{ orderItemId: 1, qty: 3, lhQty: 0, rhQty: 0 }],
		},
		lineItemComponents: {
			findMany: async () => [{
				id: 1, qty: 10, status: "completed",
				parent: { qty: 5, salesItemId: 1 },
				stockAllocations: [{ id: 7, qty: allocationQty, status: "picked" }],
			}],
		},
		stockAllocation: {
			findMany: async () => [{ id: 7, lineItemComponentId: 1 }],
			updateMany: async () => { writes++; throw new Error("Unexpected write"); },
			create: async () => { writes++; throw new Error("Unexpected write"); },
		},
	};
	return { tx, changeQuantity: (qty: number) => { allocationQty = qty; },
		locks: () => locks, writes: () => writes };
}

const identity = { salesId: 1, fulfillmentId: 2 };

test("stale inventory preview rejects before any allocation write", async () => {
	const f = fixture();
	const preview = await getShortLoadInventoryContext(f.tx as never, identity);
	f.changeQuantity(9);
	await expect(reconcileShortLoadInventoryInTransaction(f.tx as never, {
		...identity, expectedInventoryRevision: preview.revision,
		physicalReturnsConfirmed: true,
	})).rejects.toThrow("Inventory changed");
	expect(f.locks()).toBe(2);
	expect(f.writes()).toBe(0);
});

test("excess picked stock requires physical return confirmation before writes", async () => {
	const f = fixture();
	const preview = await getShortLoadInventoryContext(f.tx as never, identity);
	await expect(reconcileShortLoadInventoryInTransaction(f.tx as never, {
		...identity, expectedInventoryRevision: preview.revision,
		physicalReturnsConfirmed: false,
	})).rejects.toThrow("physically returned");
	expect(f.writes()).toBe(0);
});

test("fully retained inventory needs no return confirmation or release", async () => {
	const f = fixture();
	f.changeQuantity(6);
	const preview = await getShortLoadInventoryContext(f.tx as never, identity);
	const result = await reconcileShortLoadInventoryInTransaction(f.tx as never, {
		...identity, expectedInventoryRevision: preview.revision,
		physicalReturnsConfirmed: false,
	});
	expect(result.releases).toEqual([]);
	expect(f.writes()).toBe(0);
});
