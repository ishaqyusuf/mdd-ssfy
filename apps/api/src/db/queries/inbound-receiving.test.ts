import { describe, expect, test } from "bun:test";

import {
	applyInboundNeedsApplicationAttentionQuery,
	assignInboundDemandsQuery,
	countOrderInboundShipmentsQuery,
	createInboundShipmentFromDemandsQuery,
	listInboundNeedsApplicationAttentionQuery,
	reduceInboundShipmentDemandQuery,
	updateInboundShipmentStatusQuery,
} from "./inbound-receiving";

describe("listInboundNeedsApplicationAttentionQuery", () => {
	test("scopes attention candidates to the selected sales order", async () => {
		const queries: Array<{ sql: string; values: unknown[] }> = [];
		const result = await listInboundNeedsApplicationAttentionQuery(
			{
				db: {
					$queryRaw: async (query: { sql: string; values: unknown[] }) => {
						queries.push(query);
						return [];
					},
				},
				userId: 1,
			} as never,
			{ salesOrderId: 42, take: 20 },
		);

		expect(result).toEqual([]);
		expect(queries[0]?.sql).toContain("sale.id = ?");
		expect(queries[0]?.values).toContain(42);
	});
});

describe("applyInboundNeedsApplicationAttentionQuery", () => {
	test("applies each selected inbound once and reconciles affected sales together", async () => {
		const appliedIds: number[] = [];
		const reconciliations: unknown[] = [];
		const ctx = makeCtx({});

		const result = await applyInboundNeedsApplicationAttentionQuery(
			ctx,
			{ inboundIds: [70, 90] },
			{
				applyNeeds: async (_db, input) => {
					appliedIds.push(input.inboundId);
					return {
						inboundId: input.inboundId,
						operation: "apply",
						changed: true,
						updatedDemandCount: 2,
						recomputedComponentCount: 2,
						affectedSalesOrderIds: [input.inboundId + 100],
						applicationEventId: input.inboundId + 1000,
					};
				},
				reconcileAfterCommit: async (_db, input) => {
					reconciliations.push(input);
					return [];
				},
			},
		);

		expect(appliedIds).toEqual([70, 90]);
		expect(reconciliations).toEqual([
			{
				salesOrderIds: [170, 190],
				actorUserId: 1,
				source: "api.inbound.needs-apply-attention",
			},
		]);
		expect(result).toEqual({
			inboundIds: [70, 90],
			changedCount: 2,
			updatedDemandCount: 4,
			affectedSalesOrderIds: [170, 190],
		});
	});
});

function makeCtx(tx: Record<string, unknown>) {
	const transactionCalls: unknown[] = [];

	return {
		userId: 1,
		db: {
			users: {
				findFirstOrThrow: async () => ({
					id: 1,
					name: "Ops",
				}),
			},
			inboundShipment: {
				findFirst: async () => null,
			},
			supplier: {
				findFirst: async () => ({
					id: 10,
					name: "Supplier",
				}),
			},
			$transaction: async <T>(
				callback: (transaction: typeof tx) => Promise<T>,
			) => {
				transactionCalls.push(tx);
				return callback(tx);
			},
		},
		__transactionCalls: transactionCalls,
	} as any;
}

function makeSale(overrides: Record<string, unknown> = {}) {
	return {
		id: 100,
		orderId: "08661LM",
		status: null,
		prodStatus: null,
		deliveries: [],
		stat: [],
		...overrides,
	};
}

describe("createInboundShipmentFromDemandsQuery", () => {
	test("marks selected demand available through canonical receipt and persists AVAILABLE", async () => {
		const shipmentInputs: unknown[] = [];
		const receiptInputs: unknown[] = [];
		const salesUpdates: unknown[] = [];
		const activities: Array<{ activityType: string }> = [];
		let demandReadCount = 0;
		const ctx = makeCtx({
			lineItemComponents: {
				findMany: async () => [],
			},
			inboundDemand: {
				findMany: async () => {
					demandReadCount += 1;
					return [
						{
							lineItemComponent: {
								parent: {
									sale: makeSale(),
								},
							},
						},
					];
				},
			},
			salesOrders: {
				updateMany: async (input: unknown) => {
					salesUpdates.push(input);
					return { count: 1 };
				},
			},
		});
		ctx.db.inboundShipment = {
			findFirst: async () => ({ id: 501, reference: "08661LM" }),
		};

		const result = await createInboundShipmentFromDemandsQuery(
			ctx,
			{
				demandIds: [701],
				operation: "mark_available",
				reference: "08661LM",
			},
			{
				createShipmentFromDemands: async (_db, input) => {
					shipmentInputs.push(input);
					return {
						inboundId: 501,
						createdItemCount: 1,
						linkedDemandCount: 1,
						linkedDemandIds: [701],
					};
				},
				receiveShipment: async (_db, input) => {
					receiptInputs.push(input);
					return {
						inboundId: 501,
						shipmentStatus: "completed",
						receivedItemCount: 1,
						stockMovementCount: 1,
						issueCount: 0,
						skippedItemCount: 0,
						newlyReceivedQty: 2,
						alreadyReceivedQty: 0,
						lineItemComponentIds: [401],
						inventoryVariantIds: [301],
					};
				},
				getSalesSetting: async () => ({ meta: {} }) as never,
				autoReviewPayments: async () => ({}) as never,
				createActivity: async (_ctx, input) => {
					activities.push(input);
				},
				reconcileSalesHandoffOrders: async () => [],
			},
		);

		expect(demandReadCount).toBe(2);
		expect(shipmentInputs).toEqual([
			{
				supplierId: undefined,
				demandIds: [701],
				reference: "08661LM",
				expectedAt: undefined,
				status: "pending",
			},
		]);
		expect(receiptInputs).toEqual([{ inboundId: 501, authorName: "Ops" }]);
		expect(salesUpdates).toHaveLength(1);
		expect(salesUpdates[0]).toMatchObject({
			where: {
				id: { in: [100] },
				deletedAt: null,
				lineItems: { none: { deletedAt: null } },
			},
			data: { inventoryStatus: "AVAILABLE" },
		});
		expect(activities).toHaveLength(1);
		expect(activities[0]?.activityType).toBe("received");
		expect(result.operation).toBe("mark_available");
		expect(result.receipt?.newlyReceivedQty).toBe(2);
	});

	test("splits a partial demand selection and leaves the order status unchanged while needs remain", async () => {
		const demandUpdates: unknown[] = [];
		const demandCreates: unknown[] = [];
		const shipmentInputs: unknown[] = [];
		const salesUpdates: unknown[] = [];
		let demandReadCount = 0;
		const ctx = makeCtx({
			lineItemComponents: { findMany: async () => [] },
			inboundDemand: {
				findMany: async () => {
					demandReadCount += 1;
					if (demandReadCount === 2) {
						return [
							{
								id: 701,
								lineItemComponentId: 401,
								inventoryVariantId: 301,
								qty: 5,
								qtyReceived: 0,
								status: "pending",
								inboundShipmentItemId: null,
							},
						];
					}
					return [
						{
							lineItemComponent: { parent: { sale: makeSale() } },
						},
					];
				},
				updateMany: async (input: unknown) => {
					demandUpdates.push(input);
					return { count: 1 };
				},
				create: async (input: unknown) => {
					demandCreates.push(input);
					return { id: 702 };
				},
			},
			salesOrders: {
				updateMany: async (input: unknown) => {
					salesUpdates.push(input);
					return { count: 0 };
				},
			},
		});
		ctx.db.inboundShipment = {
			findFirst: async () => ({ id: 502, reference: "08661LM" }),
		};

		const result = await createInboundShipmentFromDemandsQuery(
			ctx,
			{
				demandSelections: [{ demandIds: [701], qty: 2 }],
				operation: "mark_available",
			},
			{
				createShipmentFromDemands: async (_db, input) => {
					shipmentInputs.push(input);
					return {
						inboundId: 502,
						createdItemCount: 1,
						linkedDemandCount: 1,
						linkedDemandIds: [702],
					};
				},
				receiveShipment: async () => ({
					inboundId: 502,
					shipmentStatus: "completed",
					receivedItemCount: 1,
					stockMovementCount: 1,
					issueCount: 0,
					skippedItemCount: 0,
					newlyReceivedQty: 2,
					alreadyReceivedQty: 0,
					lineItemComponentIds: [401],
					inventoryVariantIds: [301],
				}),
				getSalesSetting: async () => ({ meta: {} }) as never,
				autoReviewPayments: async () => ({}) as never,
				createActivity: async () => undefined,
				reconcileSalesHandoffOrders: async () => [],
			},
		);

		expect(demandUpdates).toEqual([
			{
				where: {
					id: 701,
					deletedAt: null,
					inboundShipmentItemId: null,
					qty: 5,
					qtyReceived: 0,
					status: "pending",
				},
				data: { qty: 3 },
			},
		]);
		expect(demandCreates).toEqual([
			{
				data: {
					lineItemComponentId: 401,
					inventoryVariantId: 301,
					qty: 2,
					status: "pending",
				},
				select: { id: true },
			},
		]);
		expect(shipmentInputs).toEqual([
			{
				supplierId: undefined,
				demandIds: [702],
				reference: undefined,
				expectedAt: undefined,
				status: "pending",
			},
		]);
		expect(demandReadCount).toBe(3);
		expect(salesUpdates).toHaveLength(1);
		expect(result.updatedSalesOrderCount).toBe(0);
	});

	test("rejects component-selected inbound creation for fulfilled parent orders before shipment writes", async () => {
		let shipmentCreated = false;
		let demandPrepared = false;
		const ctx = makeCtx({
			lineItemComponents: {
				findMany: async () => [
					{
						parent: {
							sale: makeSale({
								status: "Delivered",
							}),
						},
					},
				],
			},
			inboundDemand: {
				findMany: async () => {
					demandPrepared = true;
					return [];
				},
			},
			inboundShipment: {
				create: async () => {
					shipmentCreated = true;
					return { id: 1 };
				},
			},
		});

		await expect(
			createInboundShipmentFromDemandsQuery(ctx, {
				supplierId: 10,
				componentSelections: [
					{
						lineItemComponentIds: [501],
						qty: 2,
					},
				],
			}),
		).rejects.toThrow(
			"This order is fulfilled, so inventory is locked for review and repair only.",
		);

		expect(ctx.__transactionCalls).toHaveLength(1);
		expect(demandPrepared).toBe(false);
		expect(shipmentCreated).toBe(false);
	});

	test("rejects demand-id inbound creation for cancelled parent orders before shipment writes", async () => {
		let shipmentCreated = false;
		const ctx = makeCtx({
			lineItemComponents: {
				findMany: async () => [],
			},
			inboundDemand: {
				findMany: async () => [
					{
						lineItemComponent: {
							parent: {
								sale: makeSale({
									status: "Cancelled",
								}),
							},
						},
					},
				],
			},
			inboundShipment: {
				create: async () => {
					shipmentCreated = true;
					return { id: 2 };
				},
			},
		});

		await expect(
			createInboundShipmentFromDemandsQuery(ctx, {
				supplierId: 10,
				demandIds: [701],
			}),
		).rejects.toThrow(
			"This order is cancelled, so inventory is locked for review and repair only.",
		);

		expect(ctx.__transactionCalls).toHaveLength(1);
		expect(shipmentCreated).toBe(false);
	});

	test("rejects inbound creation when fulfillment is completed by delivery evidence", async () => {
		let shipmentCreated = false;
		let demandPrepared = false;
		const ctx = makeCtx({
			lineItemComponents: {
				findMany: async () => [
					{
						parent: {
							sale: makeSale({
								status: "Open",
								deliveries: [
									{
										status: "completed",
										_count: {
											items: 1,
										},
									},
								],
							}),
						},
					},
				],
			},
			inboundDemand: {
				findMany: async () => {
					demandPrepared = true;
					return [];
				},
			},
			inboundShipment: {
				create: async () => {
					shipmentCreated = true;
					return { id: 3 };
				},
			},
		});

		await expect(
			createInboundShipmentFromDemandsQuery(ctx, {
				supplierId: 10,
				componentSelections: [
					{
						lineItemComponentIds: [502],
						qty: 1,
					},
				],
			}),
		).rejects.toThrow(
			"This order is fulfilled, so inventory is locked for review and repair only.",
		);

		expect(demandPrepared).toBe(false);
		expect(shipmentCreated).toBe(false);
	});

	test("rejects inbound creation when fulfillment is completed by dispatch stat evidence", async () => {
		let shipmentCreated = false;
		const ctx = makeCtx({
			lineItemComponents: {
				findMany: async () => [],
			},
			inboundDemand: {
				findMany: async () => [
					{
						lineItemComponent: {
							parent: {
								sale: makeSale({
									status: "Open",
									stat: [
										{
											type: "dispatchCompleted",
											status: "completed",
											percentage: 100,
										},
									],
								}),
							},
						},
					},
				],
			},
			inboundShipment: {
				create: async () => {
					shipmentCreated = true;
					return { id: 4 };
				},
			},
		});

		await expect(
			createInboundShipmentFromDemandsQuery(ctx, {
				supplierId: 10,
				demandIds: [702],
			}),
		).rejects.toThrow(
			"This order is fulfilled, so inventory is locked for review and repair only.",
		);

		expect(shipmentCreated).toBe(false);
	});
});

describe("countOrderInboundShipmentsQuery", () => {
	test("counts only active shipments linked to the requested sale", async () => {
		let receivedWhere: unknown;
		const ctx = {
			db: {
				inboundShipment: {
					count: async (input: { where: unknown }) => {
						receivedWhere = input.where;
						return 2;
					},
				},
			},
		} as unknown as Parameters<typeof countOrderInboundShipmentsQuery>[0];

		expect(
			await countOrderInboundShipmentsQuery(ctx, { salesOrderId: 100 }),
		).toBe(2);
		expect(receivedWhere).toEqual({
			deletedAt: null,
			items: {
				some: {
					deletedAt: null,
					inboundDemands: {
						some: {
							deletedAt: null,
							lineItemComponent: { parent: { saleId: 100 } },
						},
					},
				},
			},
		});
	});
});

describe("updateInboundShipmentStatusQuery", () => {
	test("applies a Received status change to linked material needs in the same transaction", async () => {
		const appliedInboundIds: number[] = [];
		const transaction = {
			inboundDemand: {
				findMany: async () => [
					{
						lineItemComponent: {
							parent: {
								sale: { id: 100, orderId: "TEST-ORDER" },
							},
						},
					},
				],
			},
			inboundShipment: {
				updateMany: async () => ({ count: 1 }),
				findFirstOrThrow: async () => ({
					id: 70,
					status: "completed",
					progress: 100,
					receivedAt: new Date(),
				}),
			},
		};
		const ctx = {
			userId: 1,
			db: {
				users: {
					findFirstOrThrow: async () => ({ id: 1, name: "Ops" }),
				},
				inboundShipment: {
					findFirstOrThrow: async () => ({
						id: 70,
						status: "in_progress",
						supplierId: null,
						reference: null,
						supplier: null,
					}),
				},
				$transaction: async <T>(
					callback: (tx: typeof transaction) => Promise<T>,
				) => callback(transaction),
			},
		} as any;

		const result = await updateInboundShipmentStatusQuery(
			ctx,
			{ inboundId: 70, status: "completed" },
			{
				createActivity: async () => undefined,
				reconcileSalesHandoffOrders: async () => [],
				applyNeeds: async (_db, input) => {
					appliedInboundIds.push(input.inboundId);
					return {
						inboundId: input.inboundId,
						operation: "apply",
						changed: true,
						updatedDemandCount: 1,
						recomputedComponentCount: 1,
						affectedSalesOrderIds: [100],
						applicationEventId: 120,
					};
				},
			},
		);

		expect(appliedInboundIds).toEqual([70]);
		expect(result.needsApplication).toMatchObject({
			changed: true,
			updatedDemandCount: 1,
		});
	});

	test("repairs each affected sales projection and rediscovers released targets on retry", async () => {
		const repairedSalesOrderIds: number[] = [];
		const transaction = {
			inboundDemand: {
				findMany: async ({ where }: { where?: { OR?: unknown[] } }) => {
					return where?.OR
						? [
								{
									lineItemComponent: {
										parent: {
											sale: { id: 100, orderId: "09159PC" },
										},
									},
								},
							]
						: [];
				},
				updateMany: async () => ({ count: 0 }),
			},
			inboundShipment: {
				updateMany: async () => ({ count: 1 }),
				findFirstOrThrow: async () => ({
					id: 70,
					status: "cancelled",
					progress: 0,
					receivedAt: null,
				}),
			},
			lineItemComponents: {
				findFirst: async () => null,
				updateMany: async () => ({ count: 0 }),
			},
		};
		const ctx = {
			userId: 1,
			db: {
				users: {
					findFirstOrThrow: async () => ({ id: 1, name: "Sales rep" }),
					findMany: async () => [],
				},
				inboundShipment: {
					findFirstOrThrow: async () => ({
						id: 70,
						status: "in_progress",
						supplierId: null,
						reference: "09159PC",
						supplier: null,
					}),
				},
				noteChannels: {
					findMany: async () => [],
					createMany: async () => ({ count: 0 }),
					updateMany: async () => ({ count: 0 }),
					findUnique: async () => null,
				},
				notePadContacts: { findMany: async () => [] },
				notePad: { create: async () => ({ id: 901 }) },
				$transaction: async <T>(
					callback: (tx: typeof transaction) => Promise<T>,
				) => callback(transaction),
			},
		} as any;

		let projectionAttempt = 0;
		const handoffRepairs: number[][] = [];
		const run = () =>
			updateInboundShipmentStatusQuery(
				ctx,
				{
					inboundId: 70,
					status: "cancelled",
					note: "Supplier order cancelled.",
				},
				{
					createActivity: async () => undefined,
					reconcileSalesHandoffOrders: async (_db, input) => {
						handoffRepairs.push(input.salesOrderIds);
						return [];
					},
					syncSalesInventoryProjection: async (_db, input) => {
						projectionAttempt += 1;
						repairedSalesOrderIds.push(input.salesOrderId);
						if (projectionAttempt === 1) throw new Error("projection failed");
						return { projection: { status: "ready" } } as never;
					},
				},
			);

		await expect(run()).rejects.toThrow("projection failed");
		const result = await run();

		expect(repairedSalesOrderIds).toEqual([100, 100]);
		expect(handoffRepairs).toEqual([[100]]);
		expect(result.repairedSalesOrderCount).toBe(1);
	});

	test("captures linked sales activity context inside the status transaction", async () => {
		const transactionEvents: string[] = [];
		let activityData: any;
		const transaction = {
			inboundDemand: {
				findMany: async () => {
					transactionEvents.push("read-linked-orders");
					return [
						{
							lineItemComponent: {
								parent: {
									sale: {
										orderId: "08661LM",
									},
								},
							},
						},
						{
							lineItemComponent: {
								parent: {
									sale: {
										orderId: "08661LM",
									},
								},
							},
						},
					];
				},
			},
			inboundShipment: {
				updateMany: async () => {
					transactionEvents.push("commit-status");
					return { count: 1 };
				},
				findFirstOrThrow: async () => ({
					id: 70,
					status: "in_progress",
					progress: 0,
					receivedAt: null,
				}),
			},
		};
		const ctx = {
			userId: 1,
			db: {
				users: {
					findFirstOrThrow: async () => ({ id: 1, name: "Ops" }),
					findMany: async () => [
						{
							id: 1,
							name: "Ops",
							email: "ops@example.com",
							phoneNo: null,
						},
					],
				},
				inboundShipment: {
					findFirstOrThrow: async () => ({
						id: 70,
						status: "pending",
						supplierId: 10,
						reference: "PO-70",
						supplier: {
							name: "Supplier",
						},
					}),
				},
				noteChannels: {
					findMany: async () => [],
					createMany: async () => ({ count: 0 }),
					updateMany: async () => ({ count: 0 }),
					findUnique: async () => null,
				},
				notePadContacts: {
					findMany: async () => [
						{
							id: 9,
							profileId: 1,
							name: "Ops",
							role: "employee",
						},
					],
				},
				notePad: {
					create: async ({ data }: { data: unknown }) => {
						activityData = data;
						return { id: 901 };
					},
				},
				$transaction: async <T>(
					callback: (tx: typeof transaction) => Promise<T>,
				) => callback(transaction),
			},
		} as any;

		const previousResendKey = process.env.RESEND_API_KEY;
		process.env.RESEND_API_KEY = "re_test";
		try {
			await updateInboundShipmentStatusQuery(ctx, {
				inboundId: 70,
				status: "in_progress",
				note: "Supplier confirmed dispatch.",
			});
		} finally {
			if (previousResendKey === undefined) {
				delete process.env.RESEND_API_KEY;
			} else {
				process.env.RESEND_API_KEY = previousResendKey;
			}
		}

		expect(transactionEvents).toEqual(["read-linked-orders", "commit-status"]);
		expect(activityData.note).toBe("Supplier confirmed dispatch.");
		expect(activityData.tags.createMany.data).toContainEqual({
			tagName: "orderNos",
			tagValue: '"08661LM"',
		});
	});
});

describe("reduceInboundShipmentDemandQuery", () => {
	test("commits Sales and inbound activities with the quantity change before projection", async () => {
		const events: string[] = [];
		const transaction = {
			inboundDemand: {
				findFirstOrThrow: async () => ({
					id: 41,
					qty: 10,
					qtyReceived: 2,
					status: "partially_received",
					lineItemComponentId: 51,
					inboundShipmentItemId: 61,
					inboundShipmentItem: {
						id: 61,
						qty: 10,
						qtyGood: 2,
						qtyIssue: 0,
						inbound: { id: 71, status: "in_progress" },
					},
					lineItemComponent: {
						parent: {
							title: "Oak door",
							sale: { id: 81, orderId: "09159PC" },
						},
					},
				}),
				updateMany: async () => {
					events.push("demand");
					return { count: 1 };
				},
			},
			inboundShipmentItem: {
				updateMany: async () => {
					events.push("item");
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findFirst: async () => ({
					id: 51,
					qty: 6,
					stockAllocations: [],
					inboundDemands: [{ qty: 6, qtyReceived: 2 }],
				}),
				updateMany: async () => {
					events.push("component");
					return { count: 1 };
				},
			},
			notePad: {
				create: async ({ data }: { data: any }) => {
					const channel = data.tags.createMany.data.find(
						(tag: { tagName: string }) => tag.tagName === "channel",
					)?.tagValue;
					events.push(`activity:${channel}`);
					return { id: events.length };
				},
			},
		};
		const ctx = {
			userId: 1,
			db: {
				users: {
					findFirstOrThrow: async () => ({ id: 1, name: "Sales rep" }),
				},
				notePadContacts: {
					findFirst: async () => ({ id: 9 }),
				},
				$transaction: async <T>(
					callback: (tx: typeof transaction) => Promise<T>,
				) => {
					const result = await callback(transaction);
					events.push("commit");
					return result;
				},
			},
		} as any;

		const result = await reduceInboundShipmentDemandQuery(
			ctx,
			{
				inboundId: 71,
				demandId: 41,
				targetQty: 6,
				note: "Customer reduced quantity.",
			},
			{
				syncSalesInventoryProjection: async () => {
					events.push("projection");
					return { projection: { status: "ready" } } as never;
				},
			},
		);

		expect(result.changed).toBe(true);
		expect(events).toEqual([
			"demand",
			"item",
			"component",
			"activity:Sales",
			"activity:inventory_inbound_activity",
			"commit",
			"projection",
		]);
	});

	test("retries projection for an already committed removal without duplicating activities", async () => {
		let transactionCalled = false;
		let projectionCount = 0;
		const ctx = {
			userId: 1,
			db: {
				users: {
					findFirstOrThrow: async () => ({ id: 1, name: "Sales rep" }),
				},
				notePadContacts: { findFirst: async () => ({ id: 9 }) },
				inboundDemand: {
					findFirst: async () => ({
						id: 41,
						qty: 4,
						qtyReceived: 0,
						lineItemComponentId: 51,
						lineItemComponent: {
							parent: {
								title: "Oak door",
								sale: { id: 81, orderId: "09159PC" },
							},
						},
					}),
				},
				$transaction: async () => {
					transactionCalled = true;
				},
			},
		} as any;

		const result = await reduceInboundShipmentDemandQuery(
			ctx,
			{
				inboundId: 71,
				demandId: 41,
				targetQty: 0,
				note: "Customer removed item.",
			},
			{
				syncSalesInventoryProjection: async () => {
					projectionCount += 1;
					return { projection: { status: "ready" } } as never;
				},
			},
		);

		expect(result.changed).toBe(false);
		expect(transactionCalled).toBe(false);
		expect(projectionCount).toBe(1);
	});
});

describe("assignInboundDemandsQuery", () => {
	test("rejects fulfilled parent demand before assigning to an existing inbound", async () => {
		let shipmentLookupCalled = false;
		const ctx = makeCtx({
			inboundDemand: {
				findMany: async () => [
					{
						lineItemComponent: {
							parent: {
								sale: makeSale({
									status: "Delivered",
								}),
							},
						},
					},
				],
			},
			inboundShipment: {
				findUniqueOrThrow: async () => {
					shipmentLookupCalled = true;
					return { id: 5 };
				},
			},
		});

		await expect(
			assignInboundDemandsQuery(ctx, {
				inboundId: 5,
				demandIds: [801],
			}),
		).rejects.toThrow(
			"This order is fulfilled, so inventory is locked for review and repair only.",
		);

		expect(ctx.__transactionCalls).toHaveLength(1);
		expect(shipmentLookupCalled).toBe(false);
	});

	test("rejects cancelled parent demand before assigning to an existing inbound", async () => {
		let shipmentLookupCalled = false;
		const ctx = makeCtx({
			inboundDemand: {
				findMany: async () => [
					{
						lineItemComponent: {
							parent: {
								sale: makeSale({
									status: "Cancelled",
								}),
							},
						},
					},
				],
			},
			inboundShipment: {
				findUniqueOrThrow: async () => {
					shipmentLookupCalled = true;
					return { id: 6 };
				},
			},
		});

		await expect(
			assignInboundDemandsQuery(ctx, {
				inboundId: 6,
				demandIds: [802],
			}),
		).rejects.toThrow(
			"This order is cancelled, so inventory is locked for review and repair only.",
		);

		expect(ctx.__transactionCalls).toHaveLength(1);
		expect(shipmentLookupCalled).toBe(false);
	});
});
