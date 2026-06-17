import { describe, expect, test } from "bun:test";

import {
	fulfillInventoryDispatch,
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
				findUnique: async () => ({
					id: 101,
					qty: 1,
					inboundDemands: [],
					stockAllocations: [{ qty: 1 }],
				}),
				update: async (payload: unknown) => {
					calls.push({ name: "lineItemComponents.update", payload });
					return {};
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
			name: "lineItemComponents.update",
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
				findUnique: async () => {
					calls.push("lineItemComponents.findUnique");
					return null;
				},
				update: async () => {
					calls.push("lineItemComponents.update");
					return {};
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
				findUnique: async () => ({
					id: 101,
					qty: 1,
					inboundDemands: [],
					stockAllocations: [{ qty: 1 }],
				}),
				update: async () => {
					calls.push("lineItemComponents.update");
					return {};
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
			"lineItemComponents.update",
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
				findUnique: async () => ({
					id: 101,
					qty: 2,
					inboundDemands: [],
					stockAllocations: [{ qty: 2 }],
				}),
				update: async () => {
					calls.push("lineItemComponents.update");
					return {};
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
			"lineItemComponents.update",
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
				findUnique: async () => {
					calls.push("lineItemComponents.findUnique");
					return null;
				},
				update: async () => {
					calls.push("lineItemComponents.update");
					return {};
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
