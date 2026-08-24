import { describe, expect, test } from "bun:test";
import type { Db } from "@gnd/db";

import { resolveSalesInventoryLegacyStatusSetup } from "./sales-inventory-legacy-status-setup";

function makeDb(tx: Record<string, unknown>) {
	const salesOrders = (tx.salesOrders || {}) as Record<string, unknown>;
	const transaction = {
		lineItemComponents: {
			findMany: async () => [],
		},
		salesInventoryProjectionState: {
			upsert: async () => ({}),
		},
		...tx,
		salesOrders: {
			findFirst: async () => ({ id: 1, orderId: "09000PC" }),
			...salesOrders,
		},
	};
	return {
		$transaction: async <T>(
			callback: (currentTransaction: typeof transaction) => Promise<T>,
		) => callback(transaction),
	} as unknown as Db;
}

function lockedOverview(status = "ORDERED") {
	return {
		setupMode: "legacy_status_locked",
		inventoryStatus: status,
	};
}

describe("resolveSalesInventoryLegacyStatusSetup", () => {
	test("stops a stale saved revision before inventory, projection success, or history writes", async () => {
		const calls: string[] = [];
		const tx = {
			$queryRaw: async () => {
				calls.push("salesOrders.lock");
				return [{ id: 5 }];
			},
			salesOrders: {
				findFirst: async () => {
					calls.push("salesOrders.findFirst");
					return null;
				},
			},
			salesInventoryProjectionState: {
				upsert: async () => {
					calls.push("projection.upsert");
					return {};
				},
			},
			salesHistory: {
				create: async () => {
					calls.push("salesHistory.create");
					return { id: 10 };
				},
			},
		};

		await expect(
			resolveSalesInventoryLegacyStatusSetup(
				makeDb(tx),
				{
					salesOrderId: 5,
					action: "continue",
					legacyStatus: "AVAILABLE",
					expectedSalesUpdatedAt: new Date("2026-08-24T19:57:53.000Z"),
				},
				{
					getOverview: async () => lockedOverview("AVAILABLE"),
					syncLineItems: async () => {
						calls.push("syncSalesInventoryLineItems");
						return {};
					},
				} as never,
			),
		).rejects.toThrow("saved order revision changed");

		expect(calls).toEqual(["salesOrders.lock", "salesOrders.findFirst"]);
	});

	test("persists ready zero-need evidence for an AVAILABLE adaptation with no tracked rows", async () => {
		const projectionWrites: unknown[] = [];
		const tx = {
			$queryRaw: async () => [{ id: 7 }],
			salesOrders: {
				findFirst: async () => ({ id: 7, orderId: "09405PC" }),
			},
			lineItemComponents: {
				findMany: async () => [],
			},
			salesInventoryProjectionState: {
				upsert: async (input: unknown) => {
					projectionWrites.push(input);
					return {};
				},
			},
			salesHistory: {
				create: async () => ({ id: 12 }),
			},
		};

		const result = await resolveSalesInventoryLegacyStatusSetup(
			makeDb(tx),
			{
				salesOrderId: 7,
				action: "continue",
				legacyStatus: "AVAILABLE",
			},
			{
				getOverview: async () => lockedOverview("AVAILABLE"),
				syncLineItems: async () => ({
					salesOrderId: 7,
					createdCount: 0,
					updatedCount: 0,
					deletedCount: 0,
					skippedCount: 0,
					warnings: [],
				}),
				fulfillNeedsInTransaction: async () => ({
					fulfilledComponentCount: 0,
					protectedComponentCount: 0,
					protectedComponentIds: [],
					cancelledDemandCount: 0,
				}),
			} as never,
		);

		expect(result).toMatchObject({
			projection: { status: "ready", needCount: 0, requiredQty: 0 },
		});
		expect(projectionWrites[0]).toMatchObject({
			update: { status: "syncing", source: "legacy-status" },
		});
		expect(projectionWrites.at(-1)).toMatchObject({
			update: {
				status: "ready",
				needCount: 0,
				requiredQty: 0,
				source: "legacy-status",
			},
		});
	});

	test("resets legacy inbound status only when the reviewed baseline still matches", async () => {
		const calls: string[] = [];
		let updateArgs: unknown;
		let historyArgs: {
			data: {
				data: Record<string, unknown>;
			};
		} | null = null;
		let syncArgs: unknown;
		const tx = {
			salesOrders: {
				updateMany: async (args: unknown) => {
					calls.push("salesOrders.updateMany");
					updateArgs = args;
					return { count: 1 };
				},
			},
			salesHistory: {
				create: async (args: {
					data: {
						data: Record<string, unknown>;
					};
				}) => {
					calls.push("salesHistory.create");
					historyArgs = args;
					return { id: 10 };
				},
			},
		};

		const result = await resolveSalesInventoryLegacyStatusSetup(
			makeDb(tx),
			{
				salesOrderId: 5,
				action: "reset",
				authorName: "Inventory",
				triggeredByUserId: 7,
			},
			{
				getOverview: async () => lockedOverview("PENDING ORDER"),
				syncLineItems: async (_tx: unknown, args: unknown) => {
					calls.push("syncSalesInventoryLineItems");
					syncArgs = args;
					return { syncedLineItemCount: 2 };
				},
			} as never,
		);

		expect(calls).toEqual([
			"salesOrders.updateMany",
			"syncSalesInventoryLineItems",
			"salesHistory.create",
		]);
		expect(updateArgs).toEqual({
			where: {
				id: 5,
				deletedAt: null,
				type: "order",
				inventoryStatus: "PENDING ORDER",
			},
			data: {
				inventoryStatus: null,
			},
		});
		expect(historyArgs?.data.data).toMatchObject({
			action: "clear",
			requestedAction: "reset",
			previousInventoryStatus: "PENDING ORDER",
			nextInventoryStatus: null,
			triggeredByUserId: 7,
		});
		expect(syncArgs).toEqual({
			salesOrderId: 5,
			source: "manual",
			triggeredByUserId: 7,
		});
		expect(result).toMatchObject({
			syncedLineItemCount: 2,
			action: "clear",
			requestedAction: "reset",
			previousInventoryStatus: "PENDING ORDER",
		});
	});

	test("does not write audit history or sync when reset baseline is stale", async () => {
		const calls: string[] = [];
		const tx = {
			salesOrders: {
				updateMany: async () => {
					calls.push("salesOrders.updateMany");
					return { count: 0 };
				},
			},
			salesHistory: {
				create: async () => {
					calls.push("salesHistory.create");
					return { id: 10 };
				},
			},
		};

		let error: Error | null = null;
		try {
			await resolveSalesInventoryLegacyStatusSetup(
				makeDb(tx),
				{
					salesOrderId: 5,
					action: "reset",
				},
				{
					getOverview: async () => lockedOverview(),
					syncLineItems: async () => {
						calls.push("syncSalesInventoryLineItems");
						return {};
					},
				} as never,
			);
		} catch (caught) {
			error = caught as Error;
		}

		expect(error?.message).toBe(
			"Inventory inbound status changed before setup could run.",
		);
		expect(calls).toEqual(["salesOrders.updateMany"]);
	});

	test("guards override against the exact reviewed legacy status", async () => {
		const calls: string[] = [];
		let findArgs: unknown;
		const tx = {
			salesOrders: {
				findFirst: async (args: unknown) => {
					calls.push("salesOrders.findFirst");
					findArgs = args;
					return { id: 5 };
				},
			},
			inboundDemand: {
				findMany: async () => [],
			},
			salesHistory: {
				create: async () => {
					calls.push("salesHistory.create");
					return { id: 10 };
				},
			},
		};

		const result = await resolveSalesInventoryLegacyStatusSetup(
			makeDb(tx),
			{
				salesOrderId: 5,
				action: "override",
				triggeredByUserId: 7,
			},
			{
				getOverview: async () => ({
					setupMode: "configured",
					inventoryStatus: "ORDERED",
					hasInventoryIntegration: true,
					inventoryLegacyCompatibility: {
						state: "legacy_locked",
					},
				}),
				syncLineItems: async () => {
					calls.push("syncSalesInventoryLineItems");
					return { syncedLineItemCount: 1 };
				},
			} as never,
		);

		expect(calls).toEqual([
			"salesOrders.findFirst",
			"syncSalesInventoryLineItems",
			"salesHistory.create",
		]);
		expect(findArgs).toEqual({
			where: {
				id: 5,
				deletedAt: null,
				type: "order",
				inventoryStatus: "ORDERED",
			},
			select: {
				id: true,
				orderId: true,
			},
		});
		expect(result).toMatchObject({
			syncedLineItemCount: 1,
			action: "continue",
			requestedAction: "override",
			previousInventoryStatus: "ORDERED",
		});
	});

	test("adapts ORDERED into an in-progress supplier inbound", async () => {
		const createdInputs: unknown[] = [];
		const tx = {
			salesOrders: {
				findFirst: async () => ({ id: 5, orderId: "09068PC" }),
			},
			inboundDemand: {
				findMany: async () => [
					{
						id: 41,
						inboundShipmentItem: null,
						inventoryVariant: {
							inventory: { defaultSupplierId: 9 },
							supplierVariants: [],
						},
					},
				],
			},
			salesHistory: {
				create: async () => ({ id: 10 }),
			},
		};

		const result = await resolveSalesInventoryLegacyStatusSetup(
			makeDb(tx),
			{
				salesOrderId: 5,
				action: "continue",
				legacyStatus: "ORDERED",
			},
			{
				getOverview: async () => ({
					setupMode: "configured",
					inventoryStatus: "ORDERED",
					hasInventoryIntegration: true,
					inventoryLegacyCompatibility: {
						state: "legacy_locked",
					},
				}),
				syncLineItems: async () => ({
					salesOrderId: 5,
					createdCount: 2,
					updatedCount: 0,
					deletedCount: 0,
					skippedCount: 0,
					warnings: [],
				}),
				createInboundFromDemands: async (_tx: unknown, input: unknown) => {
					createdInputs.push(input);
					return {
						inboundId: 80,
						createdItemCount: 1,
						linkedDemandCount: 1,
						linkedDemandIds: [41],
					};
				},
			} as never,
		);

		expect(createdInputs).toEqual([
			{
				supplierId: 9,
				demandIds: [41],
				status: "in_progress",
				reference: "Legacy ORDERED adaptation for 09068PC",
			},
		]);
		expect(result).toMatchObject({
			action: "continue",
			result: "migrated",
			legacyStatus: "ORDERED",
			createdInbounds: [{ id: 80, supplierId: 9, status: "in_progress" }],
			nextSegment: "inbounds",
		});
	});

	test("adapts PENDING ORDER into a pending supplier inbound", async () => {
		const createdInputs: unknown[] = [];
		const tx = {
			salesOrders: {
				findFirst: async () => ({ id: 6, orderId: "09069PC" }),
			},
			inboundDemand: {
				findMany: async () => [
					{
						id: 42,
						inboundShipmentItem: null,
						inventoryVariant: {
							inventory: { defaultSupplierId: 10 },
							supplierVariants: [],
						},
					},
				],
			},
			salesHistory: {
				create: async () => ({ id: 11 }),
			},
		};

		const result = await resolveSalesInventoryLegacyStatusSetup(
			makeDb(tx),
			{
				salesOrderId: 6,
				action: "continue",
				legacyStatus: "PENDING ORDER",
			},
			{
				getOverview: async () => lockedOverview("PENDING ORDER"),
				syncLineItems: async () => ({
					salesOrderId: 6,
					createdCount: 1,
					updatedCount: 0,
					deletedCount: 0,
					skippedCount: 0,
					warnings: [],
				}),
				createInboundFromDemands: async (_tx: unknown, input: unknown) => {
					createdInputs.push(input);
					return {
						inboundId: 81,
						createdItemCount: 1,
						linkedDemandCount: 1,
						linkedDemandIds: [42],
					};
				},
			} as never,
		);

		expect(createdInputs[0]).toMatchObject({
			supplierId: 10,
			demandIds: [42],
			status: "pending",
		});
		expect(result).toMatchObject({
			result: "migrated",
			legacyStatus: "PENDING ORDER",
			createdInbounds: [{ id: 81, supplierId: 10, status: "pending" }],
			nextSegment: "inbounds",
		});
	});

	test("creates an unassigned in-progress inbound when ORDERED has no supplier", async () => {
		const createdInputs: unknown[] = [];
		const tx = {
			salesOrders: {
				findFirst: async () => ({ id: 8, orderId: "09071PC" }),
			},
			inboundDemand: {
				findMany: async () => [
					{
						id: 43,
						inboundShipmentItem: null,
						inventoryVariant: {
							inventory: { defaultSupplierId: null },
							supplierVariants: [],
						},
					},
				],
			},
			salesHistory: {
				create: async () => ({ id: 13 }),
			},
		};

		const result = await resolveSalesInventoryLegacyStatusSetup(
			makeDb(tx),
			{
				salesOrderId: 8,
				action: "continue",
				legacyStatus: "ORDERED",
			},
			{
				getOverview: async () => ({
					setupMode: "configured",
					inventoryStatus: "ORDERED",
					hasInventoryIntegration: true,
					inventoryLegacyCompatibility: {
						state: "legacy_locked",
					},
				}),
				syncLineItems: async () => ({
					salesOrderId: 8,
					createdCount: 1,
					updatedCount: 0,
					deletedCount: 0,
					skippedCount: 0,
					warnings: [],
				}),
				createInboundFromDemands: async (_tx: unknown, input: unknown) => {
					createdInputs.push(input);
					return {
						inboundId: 82,
						createdItemCount: 1,
						linkedDemandCount: 1,
						linkedDemandIds: [43],
					};
				},
			} as never,
		);

		expect(createdInputs).toEqual([
			{
				supplierId: null,
				demandIds: [43],
				status: "in_progress",
				reference: "Legacy ORDERED adaptation for 09071PC",
			},
		]);
		expect(result).toMatchObject({
			result: "migrated",
			unresolvedSupplierDemandIds: [43],
			createdInbounds: [{ id: 82, supplierId: null, status: "in_progress" }],
			nextSegment: "inbounds",
		});
	});

	test("advances an existing pending inbound for ORDERED without duplicating it", async () => {
		const inboundUpdates: unknown[] = [];
		const tx = {
			salesOrders: {
				findFirst: async () => ({ id: 9, orderId: "09072PC" }),
			},
			inboundDemand: {
				findMany: async () => [
					{
						id: 44,
						inboundShipmentItem: {
							inboundId: 55,
							inbound: { status: "pending" },
						},
						inventoryVariant: {
							inventory: { defaultSupplierId: null },
							supplierVariants: [],
						},
					},
				],
			},
			inboundShipment: {
				updateMany: async (input: unknown) => {
					inboundUpdates.push(input);
					return { count: 1 };
				},
			},
			salesHistory: {
				create: async () => ({ id: 14 }),
			},
		};

		const result = await resolveSalesInventoryLegacyStatusSetup(
			makeDb(tx),
			{
				salesOrderId: 9,
				action: "continue",
				legacyStatus: "ORDERED",
			},
			{
				getOverview: async () => lockedOverview("ORDERED"),
				syncLineItems: async () => ({
					salesOrderId: 9,
					createdCount: 1,
					updatedCount: 0,
					deletedCount: 0,
					skippedCount: 0,
					warnings: [],
				}),
			} as never,
		);

		expect(inboundUpdates).toEqual([
			{
				where: {
					id: 55,
					deletedAt: null,
					status: "pending",
				},
				data: {
					status: "in_progress",
				},
			},
		]);
		expect(result).toMatchObject({
			result: "migrated",
			advancedInboundIds: [55],
			linkedInboundIds: [55],
			createdInbounds: [],
			nextSegment: "inbounds",
		});
	});

	test("adapts AVAILABLE through guarded manual fulfillment without stock movement", async () => {
		const fulfillInputs: unknown[] = [];
		const tx = {
			salesOrders: {
				findFirst: async () => ({ id: 7, orderId: "09070PC" }),
			},
			salesHistory: {
				create: async () => ({ id: 12 }),
			},
		};

		const result = await resolveSalesInventoryLegacyStatusSetup(
			makeDb(tx),
			{
				salesOrderId: 7,
				action: "continue",
				legacyStatus: "AVAILABLE",
			},
			{
				getOverview: async () => lockedOverview("AVAILABLE"),
				syncLineItems: async () => ({
					salesOrderId: 7,
					createdCount: 3,
					updatedCount: 0,
					deletedCount: 0,
					skippedCount: 0,
					warnings: [],
				}),
				fulfillNeedsInTransaction: async (
					_tx: unknown,
					input: unknown,
					options: unknown,
				) => {
					fulfillInputs.push({ input, options });
					return {
						fulfilledComponentCount: 3,
						protectedComponentCount: 0,
						protectedComponentIds: [],
						cancelledDemandCount: 3,
					};
				},
			} as never,
		);

		expect(fulfillInputs).toEqual([
			{
				input: {
					salesOrderId: 7,
					authorName: undefined,
					triggeredByUserId: null,
				},
				options: {
					writeHistory: false,
				},
			},
		]);
		expect(result).toMatchObject({
			result: "migrated",
			legacyStatus: "AVAILABLE",
			fulfilledComponentCount: 3,
			noPhysicalStockChange: true,
			nextSegment: "stock",
		});
	});
});
