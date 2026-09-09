import { expect, test } from "bun:test";
import type { TRPCContext } from "../init";
import { inventoriesRouter } from "./inventories.route";
import { salesRouter } from "./sales.route";

function context(permissions: string[], enabled = false): TRPCContext {
	const tx = {
		event: { findMany: async () => [] },
		salesProductionSubmissionMaterialReview: { count: async () => 0 },
		$queryRaw: async () => [],
		users: {
			findFirstOrThrow: async () => ({
				id: 7,
				roles: [{ role: { id: 1, name: "Production" } }],
			}),
		},
		roles: {
			findFirstOrThrow: async () => ({
				name: "Production",
				RoleHasPermissions: permissions.map((name) => ({
					permission: { name },
				})),
			}),
		},
		modelHasPermissions: { findMany: async () => [] },
		salesOrders: { findFirst: async () => ({ id: 1 }) },
		orderItemProductionAssignments: {
			findMany: async () => [
				{ itemId: 10, salesDoor: { dimension: "2-0 x 6-8" } },
			],
		},
		settings: {
			findFirst: async () => ({
				meta: { production: { workerCanReceiveInbound: enabled } },
			}),
		},
		lineItemComponents: { findMany: async () => [] },
	};
	return {
		userId: 7,
		db: {
			...tx,
			$transaction: async (fn: (value: unknown) => unknown) => fn(tx),
		},
	} as unknown as TRPCContext;
}

test("production workers cannot bypass scoped receipt via general Inventory operations", async () => {
	const caller = inventoriesRouter.createCaller(context(["viewProduction"]));
	for (const action of [
		() => caller.receiveInboundShipment({ inboundId: 1 }),
		() => caller.approveStockAllocation({ allocationId: 1 }),
		() => caller.orderInboundShipments({ salesOrderId: 1 }),
		() => caller.inboundShipmentDetail({ inboundId: 1 }),
	]) {
		try {
			await action();
			throw new Error("Expected access denial");
		} catch (error) {
			expect((error as { code: string }).code).toBe("FORBIDDEN");
		}
	}
});

test("disabled worker setting rejects the actual scoped mutation route", async () => {
	const caller = salesRouter.createCaller(context(["viewProduction"]));
	await expect(
		caller.receiveProductionInbound({
			salesOrderId: 1,
			inboundId: 1,
			expectedRevision: "a".repeat(64),
			idempotencyKey: "40c03435-1820-4b1c-8e44-07d19af2bb08",
		}),
	).rejects.toThrow("disabled");
});

test("worker can read their scoped empty pending list without Inventory editing rights", async () => {
	const caller = salesRouter.createCaller(context(["viewProduction"]));
	expect(await caller.productionPendingInbounds({ salesOrderId: 1 })).toEqual({
		count: 0,
		needsSupervisor: false,
		workerMode: true,
		receipts: [],
		nextReceiptCursor: null,
		rows: [],
		nextCursor: null,
		receivingEnabled: false,
	});
});

for (const enabled of [false, true]) test(`worker cancellation is denied by actual API route (receiving enabled: ${enabled})`, async () => {
	const caller = salesRouter.createCaller(context(["viewProduction"], enabled));
	await expect(caller.cancelProductionInbound({ salesOrderId: 1, receiptId: 1, idempotencyKey: "40c03435-1820-4b1c-8e44-07d19af2bb08" })).rejects.toThrow("Only an administrator");
});

test("Inventory-only permission does not grant general Production dashboard access", async () => {
	const caller = salesRouter.createCaller(context(["viewInboundOrder"]));
	expect(
		(await caller.productionPendingInbounds({ salesOrderId: 1 })).count,
	).toBe(0);
	try {
		await caller.productionDashboard();
		throw new Error("Expected access denial");
	} catch (error) {
		expect((error as { code: string }).code).toBe("FORBIDDEN");
	}
});

test("availability shortcut does not grant production workers broad inventory authority", async () => {
 const caller = salesRouter.createCaller(context(["viewProduction"]));
 await expect(caller.markProductionMaterialsAvailable({salesOrderId:1,expectedRevision:"a".repeat(64),idempotencyKey:crypto.randomUUID(),supplierId:null,receivedDate:"2026-09-08",selection:{mode:"all"}})).rejects.toThrow("cannot mark materials available");
 await expect(caller.productionAvailabilitySuppliers({salesOrderId:1})).rejects.toThrow("cannot mark materials available");
});

test("covered-material reconciliation rejects disabled workers at the actual API boundary", async () => {
 const caller=salesRouter.createCaller(context(["viewProduction"]));
 await expect(caller.applyCoveredProductionMaterials({salesOrderId:1,expectedRevision:"a".repeat(64),idempotencyKey:crypto.randomUUID()})).rejects.toThrow("cannot apply covered production materials");
});
