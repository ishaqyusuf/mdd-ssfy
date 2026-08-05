import { describe, expect, it } from "bun:test";

import { inventoriesRouter } from "./inventories.route";

function unauthorizedOperationalContext() {
	return {
		userId: 19,
		db: {
			users: {
				findFirstOrThrow: async () => ({
					id: 19,
					email: "viewer@example.test",
					name: "Read Only User",
					phoneNo: null,
					roles: [{ role: { id: 7, name: "Read Only" } }],
				}),
			},
			roles: {
				findFirstOrThrow: async () => ({
					name: "Read Only",
					RoleHasPermissions: [],
				}),
			},
			modelHasPermissions: {
				findMany: async () => [],
			},
		},
	} as Parameters<typeof inventoriesRouter.createCaller>[0];
}

describe("inventory fulfillment route permissions", () => {
	it("rejects shipment, hold, dispatch, and received-allocation writes before domain access", async () => {
		const caller = inventoriesRouter.createCaller(
			unauthorizedOperationalContext(),
		);
		const calls = [
			() => caller.shipAvailableSalesInventory({ salesOrderId: 1 }),
			() =>
				caller.setSalesInventoryLineFulfillmentHold({
					lineItemId: 1,
					holdUntilComplete: true,
				}),
			() => caller.assignInventoryDispatchAllocations({ allocationIds: [1] }),
			() => caller.packInventoryDispatchAllocations({ allocationIds: [1] }),
			() => caller.fulfillInventoryDispatch({ salesOrderId: 1 }),
			() => caller.releaseInventoryDispatchAllocations({ allocationIds: [1] }),
			() => caller.allocateReceivedInboundToBackorders({ limit: 1 }),
		];

		for (const call of calls) {
			await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
		}
	});
});
