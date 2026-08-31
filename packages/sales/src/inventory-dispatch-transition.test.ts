import { describe, expect, test } from "bun:test";

import {
	assertDispatchInventoryReadyToStart,
	consumeDispatchBoundInventory,
	fulfillInventoryDispatch,
	releaseDispatchBoundInventory,
	shipAvailableSalesInventory,
	transitionInventoryDispatchAllocations,
} from "./sales-fulfillment-plan";

function noPendingPackingReports() {
	return { salesPackingReport: { findMany: async () => [] } };
}

describe("assertDispatchInventoryReadyToStart", () => {
	test("allows a packed trip whose physical quantity is released while approval is pending", async () => {
		const evidenceSnapshot = {
			policy: {
				enabled: true,
				allowAwaitingProductionSubmission: true,
				allowPendingMaterialReview: true,
				reviewMode: "ALLOW_DELIVERY_WHILE_PENDING",
				notifySalesRep: true,
				createProductionEvidenceOnApproval: true,
				revision: 3,
				changedAt: "2026-08-29T12:00:00.000Z",
			},
		};
		const db = {
			salesPackingReport: {
				findMany: async () => [{ evidenceSnapshot }],
			},
			orderDelivery: {
				findFirst: async () => ({ status: "packed" }),
			},
		};

		await expect(
			assertDispatchInventoryReadyToStart(db as any, {
				orderDeliveryId: 77,
				salesOrderId: 500,
			}),
		).resolves.toMatchObject({
			executionMode: "guarded_physical_verification",
		});
	});

	test("blocks an inventory-backed trip until every required component is picked", async () => {
		const db = {
			...noPendingPackingReports(),
			orderItemDelivery: {
				findMany: async () => [{ orderItemId: 44, qty: 2, lhQty: 0, rhQty: 0 }],
			},
			lineItemComponents: {
				findMany: async () => [
					{
						id: 101,
						qty: 2,
						parent: { qty: 2, salesItemId: 44 },
						stockAllocations: [{ qty: 1, status: "picked" }],
					},
				],
			},
		};

		await expect(
			assertDispatchInventoryReadyToStart(db as any, {
				orderDeliveryId: 77,
				salesOrderId: 500,
			}),
		).rejects.toThrow("INVENTORY_DISPATCH_NOT_READY");
	});

	test("allows legacy trips and fully picked inventory trips", async () => {
		const legacyDb = {
			...noPendingPackingReports(),
			orderItemDelivery: { findMany: async () => [] },
			lineItemComponents: { findMany: async () => [] },
			lineItem: { findFirst: async () => null },
		};
		await expect(
			assertDispatchInventoryReadyToStart(legacyDb as any, {
				orderDeliveryId: 77,
				salesOrderId: 500,
			}),
		).resolves.toMatchObject({ executionMode: "legacy" });

		const inventoryDb = {
			...noPendingPackingReports(),
			orderItemDelivery: {
				findMany: async () => [{ orderItemId: 44, qty: 2, lhQty: 0, rhQty: 0 }],
			},
			lineItemComponents: {
				findMany: async () => [
					{
						id: 101,
						qty: 2,
						parent: { qty: 2, salesItemId: 44 },
						stockAllocations: [{ qty: 2, status: "picked" }],
					},
				],
			},
		};
		await expect(
			assertDispatchInventoryReadyToStart(inventoryDb as any, {
				orderDeliveryId: 77,
				salesOrderId: 500,
			}),
		).resolves.toMatchObject({ executionMode: "inventory", componentCount: 1 });
	});

	test("blocks an inventory-backed trip whose exact item scope has not been created", async () => {
		const db = {
			...noPendingPackingReports(),
			orderItemDelivery: { findMany: async () => [] },
			lineItemComponents: { findMany: async () => [] },
			lineItem: { findFirst: async () => ({ id: 9 }) },
		};

		await expect(
			assertDispatchInventoryReadyToStart(db as any, {
				orderDeliveryId: 77,
				salesOrderId: 500,
			}),
		).rejects.toThrow("INVENTORY_DISPATCH_SCOPE_REQUIRED");
	});

	test("requires only this trip's proportional component quantity", async () => {
		const db = {
			...noPendingPackingReports(),
			orderItemDelivery: {
				findMany: async () => [{ orderItemId: 44, qty: 1, lhQty: 0, rhQty: 0 }],
			},
			lineItemComponents: {
				findMany: async () => [
					{
						id: 101,
						qty: 8,
						parent: { qty: 4, salesItemId: 44 },
						stockAllocations: [{ qty: 2, status: "picked" }],
					},
				],
			},
		};

		await expect(
			assertDispatchInventoryReadyToStart(db as any, {
				orderDeliveryId: 77,
				salesOrderId: 500,
			}),
		).resolves.toMatchObject({ executionMode: "inventory", componentCount: 1 });
	});
});

describe("consumeDispatchBoundInventory", () => {
	test("does not downgrade an inventory-backed trip with no bound stock to legacy", async () => {
		const tx = {
			...noPendingPackingReports(),
			stockAllocation: { findMany: async () => [] },
			orderItemDelivery: {
				findMany: async () => [{ orderItemId: 44, qty: 1, lhQty: 0, rhQty: 0 }],
			},
			lineItemComponents: {
				findMany: async () => [
					{
						id: 101,
						qty: 1,
						parent: { qty: 1, salesItemId: 44 },
						stockAllocations: [],
					},
				],
			},
			lineItem: { findFirst: async () => ({ id: 9 }) },
		};

		await expect(
			consumeDispatchBoundInventory(tx as any, {
				orderDeliveryId: 77,
				salesOrderId: 500,
			}),
		).rejects.toThrow("INVENTORY_DISPATCH_NOT_READY");
	});

	test("consumes only picked allocations bound to the completing dispatch", async () => {
		const updates: any[] = [];
		const tx = {
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						qty: 2,
						status: "picked",
						orderDeliveryId: 77,
						lineItemComponentId: 101,
						lineItemComponent: { parent: { saleId: 500 } },
					},
				],
				updateMany: async (payload: any) => {
					updates.push(payload);
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 101,
					qty: 2,
					inboundDemands: [],
					stockAllocations: [{ qty: 2 }],
				}),
				updateMany: async () => ({ count: 1 }),
			},
		};

		const result = await consumeDispatchBoundInventory(tx as any, {
			orderDeliveryId: 77,
			salesOrderId: 500,
		});

		expect(result).toEqual({
			executionMode: "inventory",
			allocationIds: [7],
			consumedQty: 2,
		});
		expect(updates[0]).toMatchObject({
			where: { id: 7, orderDeliveryId: 77, status: "picked" },
			data: { status: "consumed" },
		});
	});

	test("blocks completion when a bound allocation is not picked", async () => {
		const tx = {
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						qty: 1,
						status: "reserved",
						orderDeliveryId: 77,
						lineItemComponentId: 101,
						lineItemComponent: { parent: { saleId: 500 } },
					},
				],
				updateMany: async () => ({ count: 1 }),
			},
		};

		await expect(
			consumeDispatchBoundInventory(tx as any, {
				orderDeliveryId: 77,
				salesOrderId: 500,
			}),
		).rejects.toThrow("INVENTORY_DISPATCH_NOT_PICKED");
	});
});

describe("releaseDispatchBoundInventory", () => {
	test("releases reserved inventory but requires confirmation for picked stock", async () => {
		const tx = {
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						qty: 1,
						status: "picked",
						orderDeliveryId: 77,
						lineItemComponentId: 101,
					},
				],
			},
		};

		await expect(
			releaseDispatchBoundInventory(tx as any, { orderDeliveryId: 77 }),
		).rejects.toThrow(
			"INVENTORY_DISPATCH_PICKED_RELEASE_REQUIRES_CONFIRMATION",
		);
	});

	test("releases picked inventory after a manager confirms its physical return", async () => {
		const updates: any[] = [];
		const tx = {
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						qty: 1,
						status: "picked",
						orderDeliveryId: 77,
						lineItemComponentId: 101,
					},
				],
				updateMany: async (payload: any) => {
					updates.push(payload);
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 101,
					qty: 1,
					inboundDemands: [],
					stockAllocations: [],
				}),
				updateMany: async () => ({ count: 1 }),
			},
		};

		await expect(
			releaseDispatchBoundInventory(tx as any, {
				orderDeliveryId: 77,
				allowPickedRelease: true,
			}),
		).resolves.toMatchObject({ releasedAllocationIds: [7] });
		expect(updates[0]).toMatchObject({ data: { status: "released" } });
	});
});

describe("transitionInventoryDispatchAllocations", () => {
	test("uses a guarded status update before reporting a dispatch transition", async () => {
		const calls: Array<{ name: string; payload?: unknown }> = [];
		const tx = {
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						status: "approved",
						lineItemComponentId: 101,
						notes: "Ready",
					},
				],
				updateMany: async (payload: unknown) => {
					calls.push({ name: "stockAllocation.updateMany", payload });
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 101,
					qty: 1,
					inboundDemands: [],
					stockAllocations: [{ qty: 1 }],
				}),
				updateMany: async (payload: unknown) => {
					calls.push({ name: "lineItemComponents.updateMany", payload });
					return { count: 1 };
				},
			},
		};
		const db = {
			$transaction: async (callback: (tx: any) => Promise<unknown>) =>
				callback(tx),
		};

		const result = await transitionInventoryDispatchAllocations(
			db as any,
			"assign",
			{
				allocationIds: [7],
				note: "Assigned from dispatch mode.",
			},
		);

		expect(result).toMatchObject({
			ok: true,
			transitionedCount: 1,
			skippedCount: 0,
			touchedComponentCount: 1,
			transitions: [
				{
					allocationId: 7,
					lineItemComponentId: 101,
					fromStatus: "approved",
					toStatus: "reserved",
				},
			],
		});
		expect(calls[0]).toMatchObject({
			name: "stockAllocation.updateMany",
			payload: {
				where: {
					id: 7,
					deletedAt: null,
					status: "approved",
				},
				data: {
					status: "reserved",
					notes: "Assigned from dispatch mode.",
				},
			},
		});
		expect(calls[1]).toMatchObject({
			name: "lineItemComponents.updateMany",
			payload: {
				where: {
					id: 101,
				},
				data: {
					qtyAllocated: 1,
					status: "allocated",
				},
			},
		});
	});

	test("reports ready allocations as skipped when another dispatch action claims them first", async () => {
		const calls: string[] = [];
		const tx = {
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						status: "approved",
						lineItemComponentId: 101,
						notes: "Ready",
					},
				],
				updateMany: async () => {
					calls.push("stockAllocation.updateMany");
					return { count: 0 };
				},
			},
			lineItemComponents: {
				findFirst: async () => {
					calls.push("lineItemComponents.findFirst");
					return null;
				},
				updateMany: async () => {
					calls.push("lineItemComponents.updateMany");
					return { count: 1 };
				},
			},
		};
		const db = {
			$transaction: async (callback: (tx: any) => Promise<unknown>) =>
				callback(tx),
		};

		const result = await transitionInventoryDispatchAllocations(
			db as any,
			"assign",
			{
				allocationIds: [7],
			},
		);

		expect(result).toMatchObject({
			ok: false,
			transitionedCount: 0,
			skippedCount: 1,
			touchedComponentCount: 0,
			skipped: [
				{
					allocationId: 7,
					lineItemComponentId: 101,
					status: "approved",
					reason: "concurrently_claimed",
				},
			],
		});
		expect(calls).toEqual(["stockAllocation.updateMany"]);
	});

	test("binds assigned allocations to the existing dispatch", async () => {
		const updates: any[] = [];
		const tx = {
			orderDelivery: {
				findFirst: async () => ({
					id: 77,
					salesOrderId: 500,
					status: "queue",
				}),
			},
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						qty: 1,
						status: "approved",
						orderDeliveryId: null,
						lineItemComponentId: 101,
						inventoryStockId: 9,
						inventoryVariantId: 44,
						notes: "Ready",
						lineItemComponent: { parent: { sale: {} } },
					},
				],
				updateMany: async (payload: any) => {
					updates.push(payload);
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 101,
					qty: 1,
					inboundDemands: [],
					stockAllocations: [{ qty: 1 }],
				}),
				updateMany: async () => ({ count: 1 }),
			},
		};
		const db = {
			$transaction: async (callback: (tx: any) => Promise<unknown>) =>
				callback(tx),
		};

		await transitionInventoryDispatchAllocations(db as any, "assign", {
			salesOrderId: 500,
			allocationIds: [7],
			orderDeliveryId: 77,
		} as any);

		expect(updates[0]).toMatchObject({
			where: { id: 7, orderDeliveryId: null },
			data: { status: "reserved", orderDeliveryId: 77 },
		});
	});

	test("binds a legacy unbound reserved allocation without changing its status", async () => {
		const updates: any[] = [];
		const tx = {
			orderDelivery: {
				findFirst: async () => ({ id: 77, salesOrderId: 500, status: "queue" }),
			},
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						qty: 1,
						status: "reserved",
						orderDeliveryId: null,
						lineItemComponentId: 101,
						inventoryStockId: 9,
						inventoryVariantId: 44,
						notes: "Legacy reservation",
						lineItemComponent: { parent: { sale: {} } },
					},
				],
				updateMany: async (payload: any) => {
					updates.push(payload);
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 101,
					qty: 1,
					inboundDemands: [],
					stockAllocations: [{ qty: 1 }],
				}),
				updateMany: async () => ({ count: 1 }),
			},
		};
		const db = {
			$transaction: async (callback: (tx: any) => Promise<unknown>) =>
				callback(tx),
		};

		const result = await transitionInventoryDispatchAllocations(
			db as any,
			"assign",
			{
				salesOrderId: 500,
				orderDeliveryId: 77,
				allocationSelections: [{ allocationId: 7, qty: 1 }],
			},
		);

		expect(updates[0]).toMatchObject({
			where: { id: 7, status: "reserved", orderDeliveryId: null },
			data: { status: "reserved", orderDeliveryId: 77 },
		});
		expect(result.transitions).toEqual([
			{
				allocationId: 7,
				lineItemComponentId: 101,
				fromStatus: "reserved",
				toStatus: "reserved",
			},
		]);
	});

	test("rejects a cross-dispatch allocation before picking", async () => {
		const tx = {
			orderDelivery: {
				findFirst: async () => ({
					id: 77,
					salesOrderId: 500,
					status: "queue",
				}),
			},
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						qty: 1,
						status: "reserved",
						orderDeliveryId: 88,
						lineItemComponentId: 101,
						lineItemComponent: { parent: { sale: {} } },
					},
				],
				updateMany: async () => ({ count: 1 }),
			},
		};
		const db = {
			$transaction: async (callback: (tx: any) => Promise<unknown>) =>
				callback(tx),
		};

		await expect(
			transitionInventoryDispatchAllocations(db as any, "pack", {
				salesOrderId: 500,
				allocationIds: [7],
				orderDeliveryId: 77,
			} as any),
		).rejects.toThrow("INVENTORY_ALLOCATION_DISPATCH_MISMATCH");
	});

	test("splits an oversized approved allocation to the exact dispatch quantity", async () => {
		const updates: any[] = [];
		const creates: any[] = [];
		const tx = {
			orderDelivery: {
				findFirst: async () => ({ id: 77, salesOrderId: 500, status: "queue" }),
			},
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						qty: 3,
						status: "approved",
						orderDeliveryId: null,
						lineItemComponentId: 101,
						inventoryStockId: 9,
						inventoryVariantId: 44,
						notes: "Ready",
						lineItemComponent: { parent: { sale: {} } },
					},
				],
				updateMany: async (payload: any) => {
					updates.push(payload);
					return { count: 1 };
				},
				create: async (payload: any) => {
					creates.push(payload);
					return { id: 70 };
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 101,
					qty: 3,
					inboundDemands: [],
					stockAllocations: [{ qty: 3 }],
				}),
				updateMany: async () => ({ count: 1 }),
			},
		};
		const db = {
			$transaction: async (callback: (tx: any) => Promise<unknown>) =>
				callback(tx),
		};

		const result = await transitionInventoryDispatchAllocations(
			db as any,
			"assign",
			{
				salesOrderId: 500,
				orderDeliveryId: 77,
				allocationSelections: [{ allocationId: 7, qty: 1 }],
			} as any,
		);

		expect(updates[0]).toMatchObject({
			where: { id: 7, qty: 3, status: "approved", orderDeliveryId: null },
			data: { qty: 2 },
		});
		expect(creates[0]).toMatchObject({
			data: {
				lineItemComponentId: 101,
				inventoryStockId: 9,
				inventoryVariantId: 44,
				orderDeliveryId: 77,
				qty: 1,
				status: "reserved",
			},
		});
		expect(result.transitions[0]?.allocationId).toBe(70);
	});

	test("does not release consumed allocations while releasing eligible picked rows", async () => {
		const calls: Array<{ name: string; payload?: unknown }> = [];
		const tx = {
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						status: "consumed",
						lineItemComponentId: 101,
						notes: "Already fulfilled",
					},
					{
						id: 8,
						status: "picked",
						lineItemComponentId: 102,
						notes: "Picked for release",
					},
				],
				updateMany: async (payload: unknown) => {
					calls.push({ name: "stockAllocation.updateMany", payload });
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 102,
					qty: 1,
					inboundDemands: [],
					stockAllocations: [],
				}),
				updateMany: async (payload: unknown) => {
					calls.push({ name: "lineItemComponents.updateMany", payload });
					return { count: 1 };
				},
			},
		};
		const db = {
			$transaction: async (callback: (tx: any) => Promise<unknown>) =>
				callback(tx),
		};

		const result = await transitionInventoryDispatchAllocations(
			db as any,
			"release",
			{
				allocationIds: [7, 8],
				note: "Released from dispatch mode.",
			},
		);

		expect(result).toMatchObject({
			ok: true,
			transitionedCount: 1,
			skippedCount: 1,
			touchedComponentCount: 1,
			transitions: [
				{
					allocationId: 8,
					lineItemComponentId: 102,
					fromStatus: "picked",
					toStatus: "released",
				},
			],
			skipped: [
				{
					allocationId: 7,
					lineItemComponentId: 101,
					status: "consumed",
					reason: "already_consumed",
				},
			],
		});
		expect(calls).toEqual([
			{
				name: "stockAllocation.updateMany",
				payload: {
					where: {
						id: 8,
						deletedAt: null,
						status: "picked",
					},
					data: {
						status: "released",
						notes: "Released from dispatch mode.",
					},
				},
			},
			{
				name: "lineItemComponents.updateMany",
				payload: {
					where: {
						id: 102,
						status: {
							not: "cancelled",
						},
					},
					data: {
						qtyAllocated: 0,
						qtyInbound: 0,
						qtyReceived: 0,
						status: "pending",
					},
				},
			},
		]);
	});
});

describe("shipAvailableSalesInventory", () => {
	function saleWithAvailableAllocation() {
		return {
			id: 600,
			orderId: "08500LM",
			deliveryOption: "delivery",
			lineItems: [
				{
					id: 31,
					qty: 3,
					salesItemId: 401,
					salesItem: {
						id: 401,
						qty: 3,
						itemDeliveries: [],
					},
					components: [
						{
							id: 201,
							required: true,
							qty: 6,
							inventoryVariantId: 55,
							stockAllocations: [{ qty: 6 }],
							inboundDemands: [],
						},
					],
				},
			],
		};
	}

	test("rejects a terminal sale before consuming inventory", async () => {
		const calls: string[] = [];
		const tx = {
			salesOrders: {
				findFirst: async () => ({
					...saleWithAvailableAllocation(),
					status: "cancelled",
				}),
			},
			stockAllocation: {
				findMany: async () => {
					calls.push("stockAllocation.findMany");
					return [];
				},
			},
		};
		const db = {
			$transaction: async (callback: (transaction: any) => Promise<unknown>) =>
				callback(tx),
		};

		await expect(
			shipAvailableSalesInventory(db as any, { salesOrderId: 600 }),
		).rejects.toThrow("read-only for cancelled sales");
		expect(calls).toEqual([]);
	});

	test("consumes available allocations before writing partial shipment delivery rows", async () => {
		const calls: string[] = [];
		const updatePayloads: unknown[] = [];
		const deliveryPayloads: unknown[] = [];
		const tx = {
			salesOrders: {
				findFirst: async () => saleWithAvailableAllocation(),
				update: async () => {
					calls.push("salesOrders.update");
					return {};
				},
			},
			stockAllocation: {
				findMany: async () => [
					{
						id: 17,
						qty: 6,
						status: "reserved",
						inventoryStockId: 19,
						inventoryVariantId: 55,
						lineItemComponentId: 201,
						notes: "Reserved",
					},
				],
				updateMany: async (payload: unknown) => {
					calls.push("stockAllocation.updateMany");
					updatePayloads.push(payload);
					return { count: 1 };
				},
				create: async () => {
					calls.push("stockAllocation.create");
					return {};
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 201,
					qty: 6,
					inboundDemands: [],
					stockAllocations: [{ qty: 6 }],
				}),
				updateMany: async () => {
					calls.push("lineItemComponents.updateMany");
					return { count: 1 };
				},
			},
			inboundDemand: {
				findMany: async () => [],
				create: async () => {
					calls.push("inboundDemand.create");
					return {};
				},
			},
			orderDelivery: {
				create: async () => {
					calls.push("orderDelivery.create");
					return { id: 87 };
				},
			},
			orderItemDelivery: {
				createMany: async (payload: unknown) => {
					calls.push("orderItemDelivery.createMany");
					deliveryPayloads.push(payload);
					return { count: 1 };
				},
			},
		};
		const db = {
			$transaction: async (callback: (tx: any) => Promise<unknown>) =>
				callback(tx),
		};

		const result = await shipAvailableSalesInventory(db as any, {
			salesOrderId: 600,
		});

		expect(result).toMatchObject({
			ok: true,
			deliveryId: 87,
			shippedLineCount: 1,
			shippedQty: 3,
			consumedAllocationQty: 6,
		});
		expect(calls).toEqual([
			"stockAllocation.updateMany",
			"lineItemComponents.updateMany",
			"orderDelivery.create",
			"orderItemDelivery.createMany",
		]);
		expect(updatePayloads[0]).toMatchObject({
			where: {
				id: 17,
				deletedAt: null,
				status: "reserved",
				qty: 6,
			},
			data: {
				status: "consumed",
			},
		});
		expect(deliveryPayloads[0]).toMatchObject({
			data: [
				{
					orderId: 600,
					orderItemId: 401,
					orderDeliveryId: 87,
					qty: 3,
					status: "completed",
					packingStatus: "packed",
					meta: {
						source: "inventory_partial_shipment",
						lineItemId: 31,
						backorderedQty: 0,
					},
				},
			],
		});
	});

	test("does not write partial shipment delivery rows when allocation consumption is stale", async () => {
		const calls: string[] = [];
		const tx = {
			salesOrders: {
				findFirst: async () => saleWithAvailableAllocation(),
				update: async () => {
					calls.push("salesOrders.update");
					return {};
				},
			},
			stockAllocation: {
				findMany: async () => [
					{
						id: 17,
						qty: 6,
						status: "reserved",
						inventoryStockId: 19,
						inventoryVariantId: 55,
						lineItemComponentId: 201,
						notes: "Reserved",
					},
				],
				updateMany: async () => {
					calls.push("stockAllocation.updateMany");
					return { count: 0 };
				},
				create: async () => {
					calls.push("stockAllocation.create");
					return {};
				},
			},
			lineItemComponents: {
				findFirst: async () => {
					calls.push("lineItemComponents.findFirst");
					return null;
				},
				updateMany: async () => {
					calls.push("lineItemComponents.updateMany");
					return { count: 1 };
				},
			},
			inboundDemand: {
				findMany: async () => {
					calls.push("inboundDemand.findMany");
					return [];
				},
				create: async () => {
					calls.push("inboundDemand.create");
					return {};
				},
			},
			orderDelivery: {
				create: async () => {
					calls.push("orderDelivery.create");
					return { id: 87 };
				},
			},
			orderItemDelivery: {
				createMany: async () => {
					calls.push("orderItemDelivery.createMany");
					return { count: 1 };
				},
			},
		};
		const db = {
			$transaction: async (callback: (tx: any) => Promise<unknown>) =>
				callback(tx),
		};

		await expect(
			shipAvailableSalesInventory(db as any, {
				salesOrderId: 600,
			}),
		).rejects.toThrow(
			"Available inventory allocation was already claimed before partial shipment completed.",
		);
		expect(calls).toEqual(["stockAllocation.updateMany"]);
	});
});

describe("fulfillInventoryDispatch", () => {
	function saleWithPickedAllocation() {
		return {
			id: 500,
			orderId: "08499LM",
			deliveryOption: "pickup",
			lineItems: [
				{
					id: 21,
					qty: 1,
					salesItemId: 301,
					salesItem: {
						id: 301,
						qty: 1,
						itemDeliveries: [],
					},
					components: [
						{
							id: 101,
							required: true,
							qty: 1,
							inventoryVariantId: 44,
							stockAllocations: [{ qty: 1 }],
						},
					],
				},
			],
		};
	}

	test("consumes picked allocations before writing dispatch delivery rows", async () => {
		const calls: string[] = [];
		const updatePayloads: unknown[] = [];
		const tx = {
			salesOrders: {
				findFirst: async () => saleWithPickedAllocation(),
			},
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						qty: 1,
						status: "picked",
						inventoryStockId: 9,
						inventoryVariantId: 44,
						lineItemComponentId: 101,
						notes: "Picked",
					},
				],
				updateMany: async (payload: unknown) => {
					calls.push("stockAllocation.updateMany");
					updatePayloads.push(payload);
					return { count: 1 };
				},
				create: async () => {
					calls.push("stockAllocation.create");
					return {};
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 101,
					qty: 1,
					inboundDemands: [],
					stockAllocations: [{ qty: 1 }],
				}),
				updateMany: async () => {
					calls.push("lineItemComponents.updateMany");
					return { count: 1 };
				},
			},
			orderDelivery: {
				create: async () => {
					calls.push("orderDelivery.create");
					return { id: 77 };
				},
			},
			orderItemDelivery: {
				createMany: async () => {
					calls.push("orderItemDelivery.createMany");
					return { count: 1 };
				},
			},
		};
		const db = {
			$transaction: async (callback: (tx: any) => Promise<unknown>) =>
				callback(tx),
		};

		const result = await fulfillInventoryDispatch(db as any, {
			salesOrderId: 500,
		});

		expect(result).toMatchObject({
			ok: true,
			deliveryId: 77,
			shippedLineCount: 1,
			shippedQty: 1,
			consumedAllocationQty: 1,
		});
		expect(calls).toEqual([
			"stockAllocation.updateMany",
			"lineItemComponents.updateMany",
			"orderDelivery.create",
			"orderItemDelivery.createMany",
		]);
		expect(updatePayloads[0]).toMatchObject({
			where: {
				id: 7,
				deletedAt: null,
				status: "picked",
				qty: 1,
			},
			data: {
				status: "consumed",
			},
		});
	});

	test("guards partial picked allocation splits by the original quantity", async () => {
		const calls: string[] = [];
		const updatePayloads: unknown[] = [];
		const createdPayloads: unknown[] = [];
		const sale = saleWithPickedAllocation();
		sale.lineItems[0].qty = 2;
		sale.lineItems[0].salesItem.qty = 2;
		sale.lineItems[0].salesItem.itemDeliveries = [{ qty: 1 }];
		sale.lineItems[0].components[0].qty = 2;
		sale.lineItems[0].components[0].stockAllocations = [{ qty: 2 }];
		const tx = {
			salesOrders: {
				findFirst: async () => sale,
			},
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						qty: 2,
						status: "picked",
						inventoryStockId: 9,
						inventoryVariantId: 44,
						lineItemComponentId: 101,
						notes: "Picked",
					},
				],
				updateMany: async (payload: unknown) => {
					calls.push("stockAllocation.updateMany");
					updatePayloads.push(payload);
					return { count: 1 };
				},
				create: async (payload: unknown) => {
					calls.push("stockAllocation.create");
					createdPayloads.push(payload);
					return {};
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 101,
					qty: 2,
					inboundDemands: [],
					stockAllocations: [{ qty: 2 }],
				}),
				updateMany: async () => {
					calls.push("lineItemComponents.updateMany");
					return { count: 1 };
				},
			},
			orderDelivery: {
				create: async () => {
					calls.push("orderDelivery.create");
					return { id: 77 };
				},
			},
			orderItemDelivery: {
				createMany: async () => {
					calls.push("orderItemDelivery.createMany");
					return { count: 1 };
				},
			},
		};
		const db = {
			$transaction: async (callback: (tx: any) => Promise<unknown>) =>
				callback(tx),
		};

		const result = await fulfillInventoryDispatch(db as any, {
			salesOrderId: 500,
		});

		expect(result).toMatchObject({
			ok: true,
			deliveryId: 77,
			shippedLineCount: 1,
			shippedQty: 1,
			consumedAllocationQty: 1,
		});
		expect(calls).toEqual([
			"stockAllocation.updateMany",
			"stockAllocation.create",
			"lineItemComponents.updateMany",
			"orderDelivery.create",
			"orderItemDelivery.createMany",
		]);
		expect(updatePayloads[0]).toMatchObject({
			where: {
				id: 7,
				deletedAt: null,
				status: "picked",
				qty: 2,
			},
			data: {
				qty: 1,
			},
		});
		expect(createdPayloads[0]).toMatchObject({
			data: {
				lineItemComponentId: 101,
				inventoryStockId: 9,
				inventoryVariantId: 44,
				qty: 1,
				status: "consumed",
			},
		});
	});

	test("does not write dispatch delivery rows when picked allocation consumption is concurrently claimed", async () => {
		const calls: string[] = [];
		const tx = {
			salesOrders: {
				findFirst: async () => saleWithPickedAllocation(),
			},
			stockAllocation: {
				findMany: async () => [
					{
						id: 7,
						qty: 1,
						status: "picked",
						inventoryStockId: 9,
						inventoryVariantId: 44,
						lineItemComponentId: 101,
						notes: "Picked",
					},
				],
				updateMany: async () => {
					calls.push("stockAllocation.updateMany");
					return { count: 0 };
				},
				create: async () => {
					calls.push("stockAllocation.create");
					return {};
				},
			},
			lineItemComponents: {
				findFirst: async () => {
					calls.push("lineItemComponents.findFirst");
					return null;
				},
				updateMany: async () => {
					calls.push("lineItemComponents.updateMany");
					return { count: 1 };
				},
			},
			orderDelivery: {
				create: async () => {
					calls.push("orderDelivery.create");
					return { id: 77 };
				},
			},
			orderItemDelivery: {
				createMany: async () => {
					calls.push("orderItemDelivery.createMany");
					return { count: 1 };
				},
			},
		};
		const db = {
			$transaction: async (callback: (tx: any) => Promise<unknown>) =>
				callback(tx),
		};

		await expect(
			fulfillInventoryDispatch(db as any, {
				salesOrderId: 500,
			}),
		).rejects.toThrow(
			"Picked inventory allocation was already claimed before dispatch fulfillment completed.",
		);
		expect(calls).toEqual(["stockAllocation.updateMany"]);
	});
});
