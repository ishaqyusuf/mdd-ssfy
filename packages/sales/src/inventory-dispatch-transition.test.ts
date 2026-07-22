import { describe, expect, test } from "bun:test";

import {
	fulfillInventoryDispatch,
	shipAvailableSalesInventory,
	transitionInventoryDispatchAllocations,
} from "./sales-fulfillment-plan";

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
			$transaction: async (callback: (tx: any) => Promise<unknown>) => callback(tx),
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
			$transaction: async (callback: (tx: any) => Promise<unknown>) => callback(tx),
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
			$transaction: async (callback: (tx: any) => Promise<unknown>) => callback(tx),
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
			$transaction: async (callback: (tx: any) => Promise<unknown>) => callback(tx),
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
			"salesOrders.update",
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
			$transaction: async (callback: (tx: any) => Promise<unknown>) => callback(tx),
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
			$transaction: async (callback: (tx: any) => Promise<unknown>) => callback(tx),
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
			$transaction: async (callback: (tx: any) => Promise<unknown>) => callback(tx),
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
			$transaction: async (callback: (tx: any) => Promise<unknown>) => callback(tx),
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
