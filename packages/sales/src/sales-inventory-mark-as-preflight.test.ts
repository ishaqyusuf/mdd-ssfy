import { describe, expect, test } from "bun:test";
import type { Db } from "@gnd/db";

import {
	buildSalesInventoryMarkAsPreflight,
	resolveSalesInventoryMarkAsAutoForContinue,
	resolveSalesInventoryMarkAsAvailabilityForContinue,
} from "./sales-inventory-mark-as-preflight";

type FindManyPayload = {
	select?: {
		lineItems?: unknown;
		deliveries?: unknown;
	};
};

function makeDb(tx: Record<string, unknown>) {
	return {
		$transaction: async <T>(callback: (transaction: typeof tx) => Promise<T>) =>
			callback(tx),
	} as unknown as Db;
}

function saleWithResolvableInboundDemand() {
	return {
		id: 5,
		orderId: "08665LM",
		title: "Covered sale with stale inbound prompt",
		lineItems: [
			{
				id: 13,
				components: [
					{
						id: 24,
						required: true,
						qty: 2,
						qtyAllocated: 2,
						qtyInbound: 1,
						qtyReceived: 0,
						status: "inbound_required",
						inboundDemands: [
							{
								id: 901,
								qty: 1,
								qtyReceived: 0,
								status: "pending",
								inboundShipmentItemId: null,
							},
						],
					},
				],
			},
		],
	};
}

function saleWithResolvedInventory() {
	return {
		id: 5,
		orderId: "08665LM",
		title: "Covered sale with resolved inventory",
		lineItems: [
			{
				id: 13,
				components: [
					{
						id: 24,
						required: true,
						qty: 2,
						qtyAllocated: 2,
						qtyInbound: 0,
						qtyReceived: 0,
						status: "allocated",
						inboundDemands: [],
					},
				],
			},
		],
	};
}

describe("buildSalesInventoryMarkAsPreflight", () => {
	test("preserves legacy mark-as behavior when inventory is not configured", () => {
		const result = buildSalesInventoryMarkAsPreflight({
			action: "fulfilled",
			sales: [
				{
					id: 1,
					orderId: "08661LM",
					lineItems: [],
				},
			],
		});

		expect(result).toMatchObject({
			ok: true,
			saleCount: 1,
			configuredSaleCount: 0,
			unconfiguredSaleCount: 1,
			blockedSaleCount: 0,
		});
	});

	test("blocks mark-as when configured inventory still needs allocation", () => {
		const result = buildSalesInventoryMarkAsPreflight({
			action: "production_completed",
			sales: [
				{
					id: 2,
					orderId: "08662LM",
					lineItems: [
						{
							id: 10,
							components: [
								{
									id: 20,
									required: true,
									qty: 4,
									qtyAllocated: 1,
									status: "pending",
									inventory: {
										name: "Door slab",
									},
								},
							],
						},
					],
				},
			],
		});

		expect(result).toMatchObject({
			ok: false,
			configuredSaleCount: 1,
			blockedSaleCount: 1,
			totals: {
				pendingQty: 3,
				unresolvedComponentCount: 1,
			},
			blockers: [
				{
					salesOrderId: 2,
					orderId: "08662LM",
					readiness: "allocation_review",
					reason: "needs_allocation",
					pendingQty: 3,
					unresolvableComponentCount: 1,
					components: [
						{
							componentId: 20,
							name: "Door slab",
							pendingQty: 3,
							reason: "needs_allocation",
							canResolveAvailability: false,
						},
					],
				},
			],
		});
		expect(result.canResolveAndContinue).toBe(false);
	});

	test("blocks mark-as when configured inventory is awaiting inbound", () => {
		const result = buildSalesInventoryMarkAsPreflight({
			action: "fulfilled",
			sales: [
				{
					id: 3,
					orderId: "08663LM",
					lineItems: [
						{
							id: 11,
							components: [
								{
									id: 21,
									required: true,
									qty: 5,
									qtyAllocated: 2,
									qtyInbound: 3,
									qtyReceived: 1,
									status: "partially_received",
									inventoryVariant: {
										sku: "HINGE-BRZ",
									},
									inboundDemands: [
										{
											id: 700,
											qty: 3,
											qtyReceived: 1,
											status: "ordered",
											inboundShipmentItemId: 99,
										},
									],
								},
							],
						},
					],
				},
			],
		});

		expect(result).toMatchObject({
			ok: false,
			blockedSaleCount: 1,
			totals: {
				openInboundQty: 2,
			},
			blockers: [
				{
					readiness: "awaiting_inbound",
					reason: "awaiting_inbound",
					openInboundQty: 2,
					components: [
						{
							sku: "HINGE-BRZ",
							openInboundQty: 2,
							reason: "awaiting_inbound",
							canResolveAvailability: false,
						},
					],
				},
			],
		});
		expect(result.canResolveAndContinue).toBe(false);
	});

	test("allows safe continue only for fully covered unlinked mutable demand", () => {
		const result = buildSalesInventoryMarkAsPreflight({
			action: "fulfilled",
			sales: [
				{
					id: 5,
					orderId: "08665LM",
					lineItems: [
						{
							id: 13,
							components: [
								{
									id: 24,
									required: true,
									qty: 2,
									qtyAllocated: 2,
									qtyInbound: 1,
									qtyReceived: 0,
									status: "inbound_required",
									inboundDemands: [
										{
											id: 901,
											qty: 1,
											qtyReceived: 0,
											status: "pending",
											inboundShipmentItemId: null,
										},
									],
								},
							],
						},
					],
				},
			],
		});

		expect(result).toMatchObject({
			ok: false,
			canResolveAndContinue: true,
			totals: {
				resolvableDemandCount: 1,
				unresolvableComponentCount: 0,
			},
			blockers: [
				{
					resolvableDemandIds: [901],
					unresolvableComponentCount: 0,
					components: [
						{
							componentId: 24,
							canResolveAvailability: true,
							resolvableDemandIds: [901],
						},
					],
				},
			],
		});
	});

	test("allows mark-as when required inventory components are covered", () => {
		const result = buildSalesInventoryMarkAsPreflight({
			action: "production_completed",
			sales: [
				{
					id: 4,
					orderId: "08664LM",
					lineItems: [
						{
							id: 12,
							components: [
								{
									id: 22,
									required: true,
									qty: 2,
									qtyAllocated: 2,
									status: "allocated",
								},
								{
									id: 23,
									required: false,
									qty: 1,
									status: "pending",
								},
							],
						},
					],
				},
			],
		});

		expect(result).toMatchObject({
			ok: true,
			configuredSaleCount: 1,
			blockedSaleCount: 0,
		});
	});
});

describe("resolveSalesInventoryMarkAsAvailabilityForContinue", () => {
	test("does not mark orders available from stale preview evidence", async () => {
		const calls: string[] = [];
		const updatePayloads: unknown[] = [];
		let salesPreflightReadCount = 0;
		let demandReadCount = 0;
		const tx = {
			salesOrders: {
				findMany: async (payload: FindManyPayload) => {
					if (payload.select?.lineItems) {
						salesPreflightReadCount += 1;
						return [saleWithResolvableInboundDemand()];
					}

					calls.push("salesOrders.findMany.previous");
					return [
						{
							id: 5,
							orderId: "08665LM",
							inventoryStatus: "PENDING ORDER",
						},
					];
				},
				updateMany: async () => {
					calls.push("salesOrders.updateMany");
					return { count: 1 };
				},
			},
			inboundDemand: {
				findMany: async () => {
					demandReadCount += 1;
					if (demandReadCount === 1) {
						return [
							{
								id: 901,
								lineItemComponentId: 24,
								lineItemComponent: {
									parent: {
										saleId: 5,
									},
								},
							},
						];
					}

					return [];
				},
				updateMany: async (payload: unknown) => {
					calls.push("inboundDemand.updateMany");
					updatePayloads.push(payload);
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
			salesHistory: {
				create: async () => {
					calls.push("salesHistory.create");
					return {};
				},
			},
		};

		const result = await resolveSalesInventoryMarkAsAvailabilityForContinue(
			makeDb(tx),
			{
				salesOrderIds: [5],
				action: "fulfilled",
				authorName: "Tester",
				triggeredByUserId: 10,
			},
		);

		expect(result).toMatchObject({
			action: "fulfilled",
			continueAllowed: false,
			cancelledDemandCount: 0,
			recomputedComponentCount: 0,
			updatedSalesOrderCount: 0,
			auditHistoryCount: 0,
			preflight: {
				ok: false,
				canResolveAndContinue: true,
			},
			remainingPreflight: {
				ok: false,
			},
		});
		expect(salesPreflightReadCount).toBe(2);
		expect(calls).toEqual(["inboundDemand.updateMany"]);
		expect(updatePayloads[0]).toMatchObject({
			where: {
				id: {
					in: [901],
				},
				deletedAt: null,
				status: {
					in: ["pending", "ordered"],
				},
				inboundShipmentItemId: null,
				qtyReceived: 0,
			},
			data: {
				status: "cancelled",
			},
		});
	});

	test("marks orders available only after confirmed demand cancellation", async () => {
		const calls: Array<{ name: string; payload?: unknown }> = [];
		let salesPreflightReadCount = 0;
		let demandReadCount = 0;
		const demandRow = {
			id: 901,
			lineItemComponentId: 24,
			lineItemComponent: {
				parent: {
					saleId: 5,
				},
			},
		};
		const tx = {
			salesOrders: {
				findMany: async (payload: FindManyPayload) => {
					if (payload.select?.lineItems) {
						salesPreflightReadCount += 1;
						return salesPreflightReadCount === 1
							? [saleWithResolvableInboundDemand()]
							: [saleWithResolvedInventory()];
					}

					return [
						{
							id: 5,
							orderId: "08665LM",
							inventoryStatus: "PENDING ORDER",
						},
					];
				},
				updateMany: async (payload: unknown) => {
					calls.push({ name: "salesOrders.updateMany", payload });
					return { count: 1 };
				},
			},
			inboundDemand: {
				findMany: async () => {
					demandReadCount += 1;
					return demandReadCount <= 2 ? [demandRow] : [];
				},
				updateMany: async (payload: unknown) => {
					calls.push({ name: "inboundDemand.updateMany", payload });
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 24,
					qty: 2,
					stockAllocations: [{ qty: 2 }],
					inboundDemands: [],
				}),
				updateMany: async (payload: unknown) => {
					calls.push({ name: "lineItemComponents.updateMany", payload });
					return { count: 1 };
				},
			},
			salesHistory: {
				create: async (payload: unknown) => {
					calls.push({ name: "salesHistory.create", payload });
					return {};
				},
			},
		};

		const result = await resolveSalesInventoryMarkAsAvailabilityForContinue(
			makeDb(tx),
			{
				salesOrderIds: [5],
				action: "fulfilled",
				authorName: "Tester",
				triggeredByUserId: 10,
			},
		);

		expect(result).toMatchObject({
			action: "fulfilled",
			continueAllowed: true,
			cancelledDemandCount: 1,
			recomputedComponentCount: 1,
			updatedSalesOrderCount: 1,
			auditHistoryCount: 1,
			remainingPreflight: {
				ok: true,
			},
		});
		expect(calls.map((call) => call.name)).toEqual([
			"inboundDemand.updateMany",
			"lineItemComponents.updateMany",
			"salesOrders.updateMany",
			"salesHistory.create",
		]);
		const componentUpdate = calls.find(
			(call) => call.name === "lineItemComponents.updateMany",
		);
		const orderUpdate = calls.find(
			(call) => call.name === "salesOrders.updateMany",
		);
		const historyCreate = calls.find(
			(call) => call.name === "salesHistory.create",
		);
		expect(componentUpdate?.payload).toMatchObject({
			where: {
				id: 24,
			},
			data: {
				qtyAllocated: 2,
				qtyInbound: 0,
				qtyReceived: 0,
				status: "allocated",
			},
		});
		expect(orderUpdate?.payload).toMatchObject({
			where: {
				id: {
					in: [5],
				},
				deletedAt: null,
				type: "order",
			},
			data: {
				inventoryStatus: "AVAILABLE",
			},
		});
		expect(historyCreate?.payload).toMatchObject({
			data: {
				salesId: 5,
				name: "Inventory availability resolved for Mark As",
				authorName: "Tester",
				data: {
					type: "sales_inventory_mark_as_availability_resolved",
					action: "fulfilled",
					orderId: "08665LM",
					previousInventoryStatus: "PENDING ORDER",
					nextInventoryStatus: "AVAILABLE",
					cancelledDemandIds: [901],
					cancelledDemandCount: 1,
					recomputedComponentIds: [24],
					recomputedComponentCount: 1,
					triggeredByUserId: 10,
				},
			},
		});
	});
});

describe("resolveSalesInventoryMarkAsAutoForContinue", () => {
	test("approves allocation, creates fallback inbound demand, and allows fulfilled continue", async () => {
		const calls: Array<{ name: string; payload?: unknown }> = [];
		let preflightReadCount = 0;
		const tx = {
			salesOrders: {
				findMany: async (payload: FindManyPayload) => {
					if (payload.select?.deliveries) {
						return [
							{
								id: 5,
								orderId: "08745DB",
								status: "ready to fulfill",
								prodStatus: "completed",
								deliveries: [],
								stat: [],
							},
						];
					}
					if (payload.select?.lineItems) {
						preflightReadCount += 1;
						return [
							{
								id: 5,
								orderId: "08745DB",
								title: "Auto resolve sale",
								lineItems: [
									{
										id: 13,
										components: [
											{
												id: 24,
												required: true,
												qty: 3,
												qtyAllocated: 0,
												qtyInbound: 0,
												qtyReceived: 0,
												status: "pending",
												inventory: {
													name: "Moulding",
													defaultSupplier: null,
												},
												inventoryVariant: {
													id: 501,
													sku: "FLAT-BOARD",
													supplierVariants: [],
												},
												stockAllocations: [
													{
														id: 801,
														qty: 1,
														status: "pending_review",
													},
												],
												inboundDemands: [],
											},
										],
									},
								],
							},
						];
					}
					return [
						{
							id: 5,
							orderId: "08745DB",
							inventoryStatus: "PENDING ORDER",
						},
					];
				},
				updateMany: async (payload: unknown) => {
					calls.push({ name: "salesOrders.updateMany", payload });
					return { count: 1 };
				},
			},
			stockAllocation: {
				findMany: async () => [
					{
						id: 801,
						lineItemComponentId: 24,
						lineItemComponent: {
							parent: {
								saleId: 5,
							},
						},
					},
				],
				updateMany: async (payload: unknown) => {
					calls.push({ name: "stockAllocation.updateMany", payload });
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 24,
					qty: 3,
					stockAllocations: [{ qty: 1 }],
					inboundDemands: [{ qty: 2, qtyReceived: 0 }],
				}),
				updateMany: async (payload: unknown) => {
					calls.push({ name: "lineItemComponents.updateMany", payload });
					return { count: 1 };
				},
			},
			supplier: {
				upsert: async (payload: unknown) => {
					calls.push({ name: "supplier.upsert", payload });
					return { id: 99, name: "Auto-created inbound" };
				},
			},
			inboundDemand: {
				create: async (payload: unknown) => {
					calls.push({ name: "inboundDemand.create", payload });
					return { id: 901 };
				},
				findMany: async () => [
					{
						id: 901,
						qty: 2,
						qtyReceived: 0,
						inboundShipmentItemId: null,
						inventoryVariantId: 501,
					},
				],
				updateMany: async (payload: unknown) => {
					calls.push({ name: "inboundDemand.updateMany", payload });
					return { count: 1 };
				},
			},
			inboundShipment: {
				create: async (payload: unknown) => {
					calls.push({ name: "inboundShipment.create", payload });
					return { id: 301 };
				},
			},
			inboundShipmentItem: {
				create: async (payload: unknown) => {
					calls.push({ name: "inboundShipmentItem.create", payload });
					return { id: 401 };
				},
				updateMany: async (payload: unknown) => {
					calls.push({ name: "inboundShipmentItem.updateMany", payload });
					return { count: 1 };
				},
			},
			salesHistory: {
				create: async (payload: unknown) => {
					calls.push({ name: "salesHistory.create", payload });
					return {};
				},
			},
		};

		const result = await resolveSalesInventoryMarkAsAutoForContinue(
			makeDb(tx),
			{
				salesOrderIds: [5],
				action: "fulfilled",
				authorName: "Tester",
				triggeredByUserId: 10,
			},
		);

		expect(result).toMatchObject({
			action: "fulfilled",
			continueAllowed: true,
			approvedAllocationCount: 1,
			createdDemandCount: 1,
			createdInboundShipmentCount: 1,
			createdInboundItemCount: 1,
			linkedDemandCount: 1,
			updatedSalesOrderCount: 1,
			auditHistoryCount: 1,
		});
		expect(preflightReadCount).toBe(2);
		expect(
			calls.find((call) => call.name === "supplier.upsert")?.payload,
		).toMatchObject({
			where: {
				uid: "auto-created-inbound",
			},
			create: {
				name: "Auto-created inbound",
			},
		});
		expect(
			calls.find((call) => call.name === "inboundDemand.create")?.payload,
		).toMatchObject({
			data: {
				lineItemComponentId: 24,
				inventoryVariantId: 501,
				qty: 2,
				status: "pending",
			},
		});
		expect(
			calls.find((call) => call.name === "inboundShipment.create")?.payload,
		).toMatchObject({
			data: {
				supplierId: 99,
				status: "pending",
			},
		});
		expect(
			calls.find((call) => call.name === "salesOrders.updateMany")?.payload,
		).toMatchObject({
			data: {
				inventoryStatus: "ORDERED",
			},
		});
	});

	test("refuses terminal fulfilled orders before auto-resolution writes", async () => {
		const tx = {
			salesOrders: {
				findMany: async () => [
					{
						id: 5,
						orderId: "08745DB",
						status: null,
						prodStatus: null,
						deliveries: [
							{
								status: "completed",
								_count: {
									items: 1,
								},
							},
						],
						stat: [],
					},
				],
			},
		};

		await expect(
			resolveSalesInventoryMarkAsAutoForContinue(makeDb(tx), {
				salesOrderIds: [5],
				action: "fulfilled",
			}),
		).rejects.toThrow(
			"Order 08745DB cannot auto-resolve inventory because it is fulfilled.",
		);
	});
});
