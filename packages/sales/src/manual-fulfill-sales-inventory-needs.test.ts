import { describe, expect, test } from "bun:test";
import type { Db } from "@gnd/db";

import { fulfillSalesInventoryNeedsManually } from "./manual-fulfill-sales-inventory-needs";

function makeActiveSale() {
	return {
		id: 24416,
		orderId: "00003DPP",
		status: null,
		prodStatus: null,
		inventoryStatus: null,
		deliveries: [],
		stat: [],
	};
}

describe("fulfillSalesInventoryNeedsManually", () => {
	test("fulfills only tracked Needs rows without fabricating stock quantities", async () => {
		const calls: Array<{ name: string; payload: unknown }> = [];
		let componentReadCount = 0;
		const tx = {
			salesOrders: {
				findFirst: async () => makeActiveSale(),
				updateMany: async (payload: unknown) => {
					calls.push({ name: "salesOrders.updateMany", payload });
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findMany: async () => {
					componentReadCount += 1;
					if (componentReadCount > 1) return [];
					return [
					{
						id: 501,
						qty: 1,
						qtyAllocated: 0,
						qtyInbound: 0,
						qtyReceived: 0,
						status: "pending",
						inventoryId: 11,
						inventoryVariantId: 12,
						inventory: {
							productKind: "inventory",
							stockMode: "monitored",
						},
						inventoryCategory: {
							productKind: "inventory",
							stockMode: "monitored",
						},
						subComponent: null,
						inboundDemands: [],
					},
					{
						id: 502,
						qty: 1,
						qtyAllocated: 0,
						qtyInbound: 0,
						qtyReceived: 0,
						status: "pending",
						inventoryId: 21,
						inventoryVariantId: 22,
						inventory: {
							productKind: "component",
							stockMode: "unmonitored",
						},
						inventoryCategory: {
							productKind: "component",
							stockMode: "unmonitored",
						},
						subComponent: null,
						inboundDemands: [],
					},
					];
				},
				updateMany: async (payload: unknown) => {
					calls.push({ name: "lineItemComponents.updateMany", payload });
					return { count: 1 };
				},
			},
			inboundDemand: {
				updateMany: async (payload: unknown) => {
					calls.push({ name: "inboundDemand.updateMany", payload });
					return { count: 0 };
				},
			},
			salesHistory: {
				create: async (payload: unknown) => {
					calls.push({ name: "salesHistory.create", payload });
					return { id: 901 };
				},
			},
		};
		const db = {
			$transaction: async <T>(callback: (client: typeof tx) => Promise<T>) =>
				callback(tx),
		} as unknown as Db;

		const result = await fulfillSalesInventoryNeedsManually(db, {
			salesOrderId: 24416,
			authorName: "Ops",
			triggeredByUserId: 7,
		});

		expect(result).toMatchObject({
			salesOrderId: 24416,
			fulfilledComponentCount: 1,
			protectedComponentCount: 0,
			cancelledDemandCount: 0,
			inventoryStatus: "AVAILABLE",
		});
		expect(calls).toEqual([
			{
				name: "lineItemComponents.updateMany",
				payload: expect.objectContaining({
					where: expect.objectContaining({
						id: 501,
						inboundDemands: {
							none: {
								deletedAt: null,
								status: {
									not: "cancelled",
								},
							},
						},
					}),
					data: {
						qtyInbound: 0,
						status: "fulfilled",
					},
				}),
			},
			{
				name: "salesOrders.updateMany",
				payload: expect.objectContaining({
					data: {
						inventoryStatus: "AVAILABLE",
					},
				}),
			},
			{
				name: "salesHistory.create",
				payload: expect.objectContaining({
					data: expect.objectContaining({
						salesId: 24416,
						name: "Inventory needs manually fulfilled",
						data: expect.objectContaining({
							type: "sales_inventory_needs_manually_fulfilled",
							fulfilledComponentIds: [501],
							noPhysicalStockChange: true,
						}),
					}),
				}),
			},
		]);
	});

	test("preserves needs owned by linked or partially received inbounds", async () => {
		const calls: string[] = [];
		const tx = {
			salesOrders: {
				findFirst: async () => makeActiveSale(),
				updateMany: async () => {
					calls.push("salesOrders.updateMany");
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findMany: async () => [
					{
						id: 501,
						qty: 1,
						qtyAllocated: 0,
						qtyInbound: 1,
						qtyReceived: 0,
						status: "inbound_required",
						inventoryId: 11,
						inventoryVariantId: 12,
						inventory: {
							productKind: "inventory",
							stockMode: "monitored",
						},
						inventoryCategory: {
							productKind: "inventory",
							stockMode: "monitored",
						},
						subComponent: null,
						inboundDemands: [
							{
								id: 701,
								status: "ordered",
								qtyReceived: 0,
								inboundShipmentItemId: 72,
							},
						],
					},
				],
				updateMany: async () => {
					calls.push("lineItemComponents.updateMany");
					return { count: 1 };
				},
			},
			inboundDemand: {
				updateMany: async () => {
					calls.push("inboundDemand.updateMany");
					return { count: 1 };
				},
			},
			salesHistory: {
				create: async () => {
					calls.push("salesHistory.create");
					return { id: 902 };
				},
			},
		};
		const db = {
			$transaction: async <T>(callback: (client: typeof tx) => Promise<T>) =>
				callback(tx),
		} as unknown as Db;

		const result = await fulfillSalesInventoryNeedsManually(db, {
			salesOrderId: 24416,
			authorName: "Ops",
		});

		expect(result).toMatchObject({
			fulfilledComponentCount: 0,
			protectedComponentCount: 1,
			protectedComponentIds: [501],
			cancelledDemandCount: 0,
			inventoryStatus: null,
		});
		expect(calls).toEqual(["salesHistory.create"]);
	});

	test("aborts when a need gains an active inbound demand during fulfillment", async () => {
		const calls: string[] = [];
		const tx = {
			salesOrders: {
				findFirst: async () => makeActiveSale(),
				updateMany: async () => {
					calls.push("salesOrders.updateMany");
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findMany: async () => [
					{
						id: 501,
						qty: 1,
						qtyAllocated: 0,
						qtyInbound: 0,
						qtyReceived: 0,
						status: "pending",
						inventoryId: 11,
						inventoryVariantId: 12,
						inventory: {
							productKind: "inventory",
							stockMode: "monitored",
						},
						inventoryCategory: {
							productKind: "inventory",
							stockMode: "monitored",
						},
						subComponent: null,
						inboundDemands: [],
					},
				],
				updateMany: async () => {
					calls.push("lineItemComponents.updateMany");
					return { count: 0 };
				},
			},
			inboundDemand: {
				updateMany: async () => {
					calls.push("inboundDemand.updateMany");
					return { count: 0 };
				},
			},
			salesHistory: {
				create: async () => {
					calls.push("salesHistory.create");
					return { id: 903 };
				},
			},
		};
		const db = {
			$transaction: async <T>(callback: (client: typeof tx) => Promise<T>) =>
				callback(tx),
		} as unknown as Db;

		expect(
			fulfillSalesInventoryNeedsManually(db, {
				salesOrderId: 24416,
				authorName: "Ops",
			}),
		).rejects.toThrow("Inventory needs changed");
		expect(calls).toEqual(["lineItemComponents.updateMany"]);
	});
});
