import { describe, expect, test } from "bun:test";

import { allocateReceivedInboundToBackorders } from "./sales-fulfillment-plan";

function makeDb(tx: Record<string, unknown>) {
	return {
		$transaction: async <T>(callback: (transaction: typeof tx) => Promise<T>) =>
			callback(tx),
	} as any;
}

describe("allocateReceivedInboundToBackorders", () => {
	test("skips received demand that is already covered by active allocations", async () => {
		const calls: string[] = [];
		const tx = {
			inboundDemand: {
				findMany: async () => [
					{
						id: 11,
						qty: 4,
						qtyReceived: 4,
						inventoryVariantId: 501,
						lineItemComponentId: 101,
					},
				],
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 101,
					qty: 4,
					stockAllocations: [{ qty: 4 }],
				}),
				updateMany: async () => {
					calls.push("lineItemComponents.updateMany");
					return { count: 1 };
				},
			},
			inventoryStock: {
				findMany: async () => [
					{
						id: 701,
						qty: 10,
					},
				],
			},
			stockAllocation: {
				findMany: async () => [
					{
						inventoryStockId: 701,
						qty: 4,
					},
				],
				create: async () => {
					calls.push("stockAllocation.create");
					return {};
				},
			},
		};

		const result = await allocateReceivedInboundToBackorders(makeDb(tx));

		expect(result).toEqual({
			ok: false,
			processedDemandCount: 1,
			skippedDemandCount: 1,
			alreadyCoveredDemandCount: 1,
			touchedComponentCount: 0,
			allocatedQty: 0,
			remainingBackorderQty: 0,
			allocations: [],
		});
		expect(calls).toEqual([]);
	});

	test("reserves only the uncovered quantity for partially covered demand", async () => {
		const calls: Array<{ name: string; payload?: unknown }> = [];
		const activeAllocations = [
			{
				inventoryStockId: 701,
				qty: 3,
			},
		];
		const tx = {
			inboundDemand: {
				findMany: async () => [
					{
						id: 12,
						qty: 5,
						qtyReceived: 5,
						inventoryVariantId: 501,
						lineItemComponentId: 101,
					},
				],
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 101,
					qty: 5,
					stockAllocations: activeAllocations.map((allocation) => ({
						qty: allocation.qty,
					})),
					inboundDemands: [
						{
							qty: 5,
							qtyReceived: 5,
						},
					],
				}),
				updateMany: async (payload: unknown) => {
					calls.push({ name: "lineItemComponents.updateMany", payload });
					return { count: 1 };
				},
			},
			inventoryStock: {
				findMany: async () => [
					{
						id: 701,
						qty: 10,
					},
				],
			},
			stockAllocation: {
				findMany: async () => activeAllocations,
				create: async (payload: {
					data: {
						inventoryStockId: number;
						qty: number;
					};
				}) => {
					calls.push({ name: "stockAllocation.create", payload });
					activeAllocations.push({
						inventoryStockId: payload.data.inventoryStockId,
						qty: payload.data.qty,
					});
					return {};
				},
			},
		};

		const result = await allocateReceivedInboundToBackorders(makeDb(tx), {
			note: "Retry-safe received backorder release.",
		});

		expect(result).toMatchObject({
			ok: true,
			processedDemandCount: 1,
			skippedDemandCount: 0,
			alreadyCoveredDemandCount: 0,
			touchedComponentCount: 1,
			allocatedQty: 2,
			remainingBackorderQty: 0,
			allocations: [
				{
					lineItemComponentId: 101,
					inventoryVariantId: 501,
					inventoryStockId: 701,
					qty: 2,
				},
			],
		});
		expect(calls[0]).toMatchObject({
			name: "stockAllocation.create",
			payload: {
				data: {
					lineItemComponentId: 101,
					inventoryVariantId: 501,
					inventoryStockId: 701,
					qty: 2,
					status: "reserved",
					notes: "Retry-safe received backorder release.",
				},
			},
		});
		expect(calls[1]).toMatchObject({
			name: "lineItemComponents.updateMany",
			payload: {
				where: {
					id: 101,
					deletedAt: null,
				},
				data: {
					qtyAllocated: 5,
					qtyInbound: 5,
					qtyReceived: 5,
					status: "fulfilled",
				},
			},
		});
	});

	test("skips received demand when the component is no longer active", async () => {
		const calls: string[] = [];
		const tx = {
			inboundDemand: {
				findMany: async () => [
					{
						id: 13,
						qty: 3,
						qtyReceived: 3,
						inventoryVariantId: 501,
						lineItemComponentId: 101,
					},
				],
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
			inventoryStock: {
				findMany: async () => {
					calls.push("inventoryStock.findMany");
					return [];
				},
			},
			stockAllocation: {
				findMany: async () => {
					calls.push("stockAllocation.findMany");
					return [];
				},
				create: async () => {
					calls.push("stockAllocation.create");
					return {};
				},
			},
		};

		const result = await allocateReceivedInboundToBackorders(makeDb(tx));

		expect(result).toEqual({
			ok: false,
			processedDemandCount: 1,
			skippedDemandCount: 1,
			alreadyCoveredDemandCount: 0,
			touchedComponentCount: 0,
			allocatedQty: 0,
			remainingBackorderQty: 0,
			allocations: [],
		});
		expect(calls).toEqual(["lineItemComponents.findFirst"]);
	});
});
