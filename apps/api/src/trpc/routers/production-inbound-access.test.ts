import { expect, test } from "bun:test";
import type { TRPCContext } from "../init";
import { inventoriesRouter } from "./inventories.route";
import { salesRouter } from "./sales.route";

function context(permissions: string[], enabled = false): TRPCContext {
	const tx = {
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
		rows: [],
		nextCursor: null,
		receivingEnabled: false,
	});
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
