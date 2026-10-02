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
	it("rejects unauthorized stock writes and stock selectors before domain access", async () => {
		const caller = inventoriesRouter.createCaller(
			unauthorizedOperationalContext(),
		);
		await expect(
			caller.adjustInventoryStock({
				inventoryVariantId: 1,
				qty: 5,
				expectedQty: 0,
				reason: "stock_in",
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(caller.stockVariantBalances({ inventoryVariantIds: [1] })).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(caller.stockVariantOptions({})).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
		await expect(
			caller.stockVariantContext({ inventoryVariantId: 1 }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
	it("rejects stock policy changes and individual thresholds without a configuration grant", async () => {
		const caller = inventoriesRouter.createCaller(unauthorizedOperationalContext());
		await expect(caller.setStockPolicy({ categoryId: 1, tracked: true, lowStockAlert: 0, promptAvailableStock: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(caller.setVariantStockThreshold({ inventoryVariantId: 1, lowStockAlert: null })).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(caller.setVariantStockAlerts({ inventoryVariantId: 1, enabled: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
	it("rejects sales stock application and warehouse inbound without an operator grant", async () => {
        const caller = inventoriesRouter.createCaller(unauthorizedOperationalContext());
        await expect(caller.applySalesFormStock({ salesOrderId: 1, expectedRevision: "a".repeat(64) })).rejects.toMatchObject({ code: "FORBIDDEN" });
        await expect(caller.salesFormStockPlan({ salesOrderId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
        await expect(caller.salesFormStockPreview({ lineItems: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
        await expect(caller.createGeneralInbound({ idempotencyKey: crypto.randomUUID(), items: [{ inventoryVariantId: 1, qty: 2 }] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
	it("rejects shipment, hold, dispatch, and received-allocation writes before domain access", async () => {
		const caller = inventoriesRouter.createCaller(
			unauthorizedOperationalContext(),
		);
		const calls = [
			() => caller.repairSalesStockTracking({ inventoryCategoryId: 1, salesOrderIds: [1] }),
			() => caller.salesInventoryTrackingChangeRepairPreview({ inventoryCategoryId: 1 }),
			() => caller.receiveInboundShipment({ inboundId: 1 }),
			() => caller.syncSalesInventoryOverview({ salesOrderId: 1 }),
			() => caller.createInboundShipment({}),
            () => caller.assignInboundDemands({ inboundId: 1, demandIds: [1] }),
            () => caller.createInboundShipmentFromDemands({ demandIds: [1] }),
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
			() =>
				caller.createInboundShipmentFromDemands({
					operation: "mark_available",
					demandIds: [1],
				}),
		];

		for (const call of calls) {
			await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
		}
	});

	it("rejects Mark as Fulfilled preflight without the dedicated permission", async () => {
		const caller = inventoriesRouter.createCaller(
			unauthorizedOperationalContext(),
		);
		await expect(
			caller.salesInventoryMarkAsPreflight({
				salesOrderIds: [1],
				action: "fulfilled",
			}),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: "You do not have permission to perform this action.",
		});
	});
});
