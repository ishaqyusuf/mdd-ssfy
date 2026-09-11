import { describe, expect, it } from "bun:test";
import type { Db } from "@gnd/db";
import { ensureSalesOrderFulfillmentDispatch } from "./ensure-fulfillment-dispatch";

function createDb(input: {
	sale: {
		id: number;
		orderId: string;
		deliveredAt: Date | null;
		deliveryOption: string | null;
        deliveryDueDate?: Date | null;
        status?: string | null;
		deliveries: Array<{ id: number; status: string | null }>;
	};
	remainingQty?: number;
	createdDispatchId?: number;
	transactionErrors?: Array<{ code: string }>;
}) {
	const created: unknown[] = [];
    const audits: unknown[] = [];
	let attempts = 0;
	const tx = {
        salesHistory: { create: async (args: unknown) => { audits.push(args); return {}; } },
		salesOrders: {
			findFirstOrThrow: async () => input.sale,
            findUniqueOrThrow: async () => ({
                id: input.sale.id, completionRecords: [],
                itemControls: [{ uid: "a", orderItemId: 1, title: "Door", shippable: true, qtyControls: [{ qty: 5, total: 5, lh: 0, rh: 0 }] }],
                deliveries: input.sale.deliveries.map(delivery => ({ id: delivery.id, status: delivery.status, meta: { dispatchCompletion: { status: "completed" }, fulfillmentAssignment: { version: 1, revision: 1, selectionMode: "selected", lines: [{ uid: "a", quantity: { qty: 5 - (input.remainingQty ?? 0), lh: 0, rh: 0 } }] } }, _count: { stockAllocations: 0 }, items: [{ orderDeliveryId: 10, orderItemId: 1, packingStatus: "packed", qty: 5 - (input.remainingQty ?? 0), lhQty: 0, rhQty: 0, submission: null }] })),
            }),
		},
		orderDelivery: {
			create: async (args: unknown) => {
				created.push(args);
				return { id: input.createdDispatchId ?? 99 };
			},
		},
	};
	const db = {
		$transaction: async (callback: (transaction: typeof tx) => unknown) => {
			attempts += 1;
			const error = input.transactionErrors?.shift();
			if (error) throw error;
			return callback(tx);
		},
	} as unknown as Db;
	return { db, created, audits, getAttempts: () => attempts };
}

describe("ensureSalesOrderFulfillmentDispatch", () => {
	it("reuses an active dispatch", async () => {
		const fixture = createDb({
			sale: {
				id: 1,
				orderId: "A",
				deliveredAt: null,
				deliveryOption: "pickup",
				deliveries: [{ id: 10, status: "queue" }],
			},
		});
		await expect(
			ensureSalesOrderFulfillmentDispatch(fixture.db, {
				salesId: 1,
				createdById: 5,
			}),
		).resolves.toMatchObject({
			dispatchId: 10,
			state: "ready",
			created: false,
		});
		expect(fixture.created).toHaveLength(0);
        expect(fixture.audits).toHaveLength(0);
	});

	it("treats a completed dispatch as an idempotent fulfillment", async () => {
		const fixture = createDb({
			sale: {
				id: 1,
				orderId: "A",
				deliveredAt: null,
				deliveryOption: "delivery",
				deliveries: [{ id: 10, status: "completed" }],
			},
		});
		await expect(
			ensureSalesOrderFulfillmentDispatch(fixture.db, {
				salesId: 1,
				createdById: 5,
			}),
		).resolves.toMatchObject({
			dispatchId: 10,
			state: "already_fulfilled",
		});
		expect(fixture.created).toHaveLength(0);
        expect(fixture.audits).toHaveLength(0);
	});

	it("creates one queue dispatch and retries serialization conflicts", async () => {
		const fixture = createDb({
			sale: {
				id: 1,
				orderId: "A",
				deliveredAt: null,
				deliveryOption: "pickup",
				deliveries: [],
			},
			createdDispatchId: 44,
			transactionErrors: [{ code: "P2034" }],
		});
		await expect(
			ensureSalesOrderFulfillmentDispatch(fixture.db, {
				salesId: 1,
				createdById: 5,
				now: new Date("2026-08-29T00:00:00.000Z"),
			}),
		).resolves.toMatchObject({
			dispatchId: 44,
			state: "ready",
			created: true,
		});
		expect(fixture.getAttempts()).toBe(2);
		expect(fixture.created).toHaveLength(1);
        expect(fixture.audits).toHaveLength(1);
        expect(fixture.audits[0]).toMatchObject({ data: { salesId: 1, data: { event: "FULFILLMENT_ASSIGNED", dispatchId: 44, actorId: 5, plannedQty: 5 } } });
        expect(fixture.created[0]).toMatchObject({ data: { meta: { fulfillmentAssignment: { selectionMode: "all_remaining", lines: [{ uid: "a", quantity: { qty: 5, lh: 0, rh: 0 } }] } } } });
	});
});

it("creates only the remainder after a completed partial delivery", async () => {
    const fixture = createDb({ remainingQty: 2, sale: { id: 1, orderId: "A", deliveredAt: new Date(), deliveryOption: "delivery", deliveries: [{ id: 10, status: "completed" }] } });
    expect(await ensureSalesOrderFulfillmentDispatch(fixture.db, { salesId: 1, createdById: 5 })).toMatchObject({ state: "ready", created: true });
    expect(fixture.created[0]).toMatchObject({ data: { meta: { fulfillmentAssignment: { lines: [{ uid: "a", quantity: { qty: 2, lh: 0, rh: 0 } }] } } } });
});

it("keeps the order fulfillment date and rejects cancelled orders", async () => {
    const date = new Date("2026-09-11T00:00:00Z");
    const sale = { id: 1, orderId: "A", deliveredAt: null, deliveryOption: "delivery", deliveryDueDate: date, deliveries: [] };
    const fixture = createDb({ sale });
    await ensureSalesOrderFulfillmentDispatch(fixture.db, { salesId: 1, createdById: 5 });
    expect(fixture.created[0]).toMatchObject({ data: { dueDate: date } });
    const closed = createDb({ sale: { ...sale, status: "cancelled" } });
    await expect(ensureSalesOrderFulfillmentDispatch(closed.db, { salesId: 1, createdById: 5 })).rejects.toThrow("closed");
    expect(closed.created).toHaveLength(0);
});
