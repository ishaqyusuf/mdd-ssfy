import { describe, expect, test } from "bun:test";
import {
	getSalesInventoryOrderRepairPreview,
	resolveSalesInventoryOrderRepair,
} from "./sales-inventory-order-repair";

function component(overrides: Record<string, unknown> = {}) {
	return {
		id: 501,
		qty: 2,
		parent: { id: 41, title: "Dining table", deletedAt: null },
		inventoryCategory: { title: "Table tops" },
		inventory: { name: "Oak top" },
		inventoryVariant: {
			uid: "oak-120",
			sku: "OAK-120",
			description: "120cm oak",
		},
		inboundDemands: [],
		stockAllocations: [],
		...overrides,
	};
}

describe("sales inventory order repair", () => {
	test("preview separates safe residue from linked and picked rows", async () => {
		const db = {
			salesOrders: {
				findFirstOrThrow: async () => ({ id: 100, orderId: "SO-100" }),
			},
			lineItemComponents: {
				findMany: async () => [
					component({
						inboundDemands: [
							{
								id: 1,
								qty: 2,
								qtyReceived: 0,
								status: "pending",
								inboundShipmentItemId: null,
								inboundShipmentItem: null,
							},
							{
								id: 2,
								qty: 1,
								qtyReceived: 0,
								status: "ordered",
								inboundShipmentItemId: 22,
								inboundShipmentItem: { inboundId: 9 },
							},
						],
						stockAllocations: [
							{ id: 3, qty: 1, status: "approved" },
							{ id: 4, qty: 1, status: "picked" },
						],
					}),
				],
			},
		} as unknown as Parameters<typeof getSalesInventoryOrderRepairPreview>[0];

		const preview = await getSalesInventoryOrderRepairPreview(db, {
			salesOrderId: 100,
		});

		expect(preview.actionableDemand.map((row) => row.id)).toEqual([1]);
		expect(preview.actionableAllocations.map((row) => row.id)).toEqual([3]);
		expect(preview.reviewDemand[0]).toMatchObject({
			id: 2,
			inboundId: 9,
			reason: "linked_inbound",
		});
		expect(preview.reviewAllocations[0]).toMatchObject({
			id: 4,
			reason: "picked_or_consumed",
		});
	});

	test("apply requires the reviewed baseline and recomputes affected components", async () => {
		const updateCalls: unknown[] = [];
		const historyCalls: unknown[] = [];
		const tx = {
			salesOrders: {
				findFirstOrThrow: async () => ({ id: 100, orderId: "SO-100" }),
			},
			inboundDemand: {
				findMany: async () => [
					{
						id: 1,
						lineItemComponentId: 501,
						status: "pending",
						qty: 2,
						qtyReceived: 0,
						inboundShipmentItemId: null,
					},
				],
				updateMany: async (args: unknown) => {
					updateCalls.push({ type: "demand", args });
					return { count: 1 };
				},
			},
			stockAllocation: {
				findMany: async () => [
					{ id: 3, lineItemComponentId: 501, status: "approved", qty: 1 },
				],
				updateMany: async (args: unknown) => {
					updateCalls.push({ type: "allocation", args });
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 501,
					qty: 2,
					stockAllocations: [],
					inboundDemands: [],
				}),
				updateMany: async () => ({ count: 1 }),
			},
			salesHistory: {
				create: async (args: unknown) => {
					historyCalls.push(args);
					return { id: 77 };
				},
			},
		};
		const db = {
			$transaction: async (callback: (value: typeof tx) => Promise<unknown>) =>
				callback(tx),
		} as unknown as Parameters<typeof resolveSalesInventoryOrderRepair>[0];

		const result = await resolveSalesInventoryOrderRepair(db, {
			salesOrderId: 100,
			demandBaselines: [
				{
					id: 1,
					lineItemComponentId: 501,
					status: "pending",
					qty: 2,
					qtyReceived: 0,
					inboundShipmentItemId: null,
				},
			],
			allocationBaselines: [
				{ id: 3, lineItemComponentId: 501, status: "approved", qty: 1 },
			],
		});

		expect(result.cancelledDemandIds).toEqual([1]);
		expect(result.releasedAllocationIds).toEqual([3]);
		expect(result.recomputedComponentCount).toBe(1);
		expect(result.auditHistoryCount).toBe(77);
		expect(updateCalls).toHaveLength(2);
		expect(historyCalls).toHaveLength(1);
	});
});
