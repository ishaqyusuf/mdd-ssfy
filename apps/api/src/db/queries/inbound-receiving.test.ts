import { describe, expect, test } from "bun:test";

import {
	assignInboundDemandsQuery,
	createInboundShipmentFromDemandsQuery,
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
