import { describe, expect, it } from "bun:test";
import type { Db } from "@gnd/db";
import { ensureSalesOrderFulfillmentDispatch } from "./ensure-fulfillment-dispatch";

function createDb(input: {
	sale: {
		id: number;
		orderId: string;
		deliveredAt: Date | null;
		deliveryOption: string | null;
		deliveries: Array<{ id: number; status: string | null }>;
	};
	createdDispatchId?: number;
	transactionErrors?: Array<{ code: string }>;
}) {
	const created: unknown[] = [];
	let attempts = 0;
	const tx = {
		salesOrders: {
			findFirstOrThrow: async () => input.sale,
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
	return { db, created, getAttempts: () => attempts };
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
	});
});
