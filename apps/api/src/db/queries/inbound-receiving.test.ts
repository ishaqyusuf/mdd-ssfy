import { describe, expect, test } from "bun:test";

import {
	assignInboundDemandsQuery,
	countOrderInboundShipmentsQuery,
	createInboundShipmentFromDemandsQuery,
	updateInboundShipmentStatusQuery,
} from "./inbound-receiving";

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

		expect(transactionEvents).toEqual([
			"read-linked-orders",
			"commit-status",
		]);
		expect(activityData.note).toBe("Supplier confirmed dispatch.");
		expect(activityData.tags.createMany.data).toContainEqual({
			tagName: "orderNos",
			tagValue: '"08661LM"',
		});
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
