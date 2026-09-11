import { expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import { deliverFulfillmentNotificationIntents } from "./fulfillment-notification-delivery";
import { buildFulfillmentNotificationIntents } from "./fulfillment-notification-intents";

function fixture(kind: "updated" | "completed" = "updated") {
	const notices = buildFulfillmentNotificationIntents({
		requestId: "command-1",
		salesId: 1,
		fulfillmentId: 2,
		actorId: 3,
		driverId: 4,
		previousDriverId: 5,
		changed: true,
		kind,
		completedByAdmin: kind === "completed",
		dueDate: null,
		deliveryMode: "delivery",
	});
	const event = {
		salesId: 1,
		authorName: "Admin",
		data: { dispatchId: 2, notificationIntents: notices },
	};
	let receipts = new Map<string, { data: unknown }>();
	const calls: string[] = [];
	const db = {
		$transaction: async (run: (tx: unknown) => Promise<unknown>) => {
			const pending = new Map(receipts);
			const tx = {
				$queryRaw: async () => {
					calls.push("lock");
					return [];
				},
				salesHistory: {
					findUniqueOrThrow: async () => event,
					findUnique: async ({ where }: { where: { id: string } }) =>
						pending.get(where.id) ?? null,
					create: async ({ data }: { data: { id: string; data: unknown } }) => {
						pending.set(data.id, { data: data.data });
						return data;
					},
				},
			};
			const result = await run(tx);
			receipts = pending;
			return result;
		},
	} as unknown as Db;
	return { db, event, calls, receiptCount: () => receipts.size };
}

test("completion delivery retains attribution and reuses its receipt on retry", async () => {
	const state = fixture("completed");
	let deliveries = 0;
	const deliver = async (_tx: unknown, intent: { completedByAdmin?: boolean; channel: string }) => {
		expect(intent).toMatchObject({ channel: "sales_dispatch_completed", completedByAdmin: true });
		deliveries++;
		return 10;
	};
	await deliverFulfillmentNotificationIntents(state.db, "command-1", deliver);
	await deliverFulfillmentNotificationIntents(state.db, "command-1", deliver);
	expect(deliveries).toBe(1);
	expect(state.receiptCount()).toBe(1);
});

test("replaying delivery returns existing activity receipts without delivering again", async () => {
	const state = fixture();
	let delivered = 0;
	const deliver = async () => {
		expect(state.calls.at(-1)).toBe("lock");
		return ++delivered;
	};
	expect(
		await deliverFulfillmentNotificationIntents(state.db, "command-1", deliver),
	).toEqual({ activityIds: [1, 2] });
	expect(
		await deliverFulfillmentNotificationIntents(state.db, "command-1", deliver),
	).toEqual({ activityIds: [1, 2] });
	expect(delivered).toBe(2);
	expect(state.receiptCount()).toBe(2);
});

test("a delivery failure rolls back receipts and permits retry", async () => {
	const state = fixture();
	let calls = 0;
	await expect(
		deliverFulfillmentNotificationIntents(state.db, "command-1", async () => {
			if (++calls === 2) throw new Error("Activity write failed");
			return 1;
		}),
	).rejects.toThrow("Activity write failed");
	expect(state.receiptCount()).toBe(0);
	expect(
		await deliverFulfillmentNotificationIntents(
			state.db,
			"command-1",
			async () => 3,
		),
	).toEqual({ activityIds: [3, 3] });
});

test("rejects an intent for a different order before delivery", async () => {
	const state = fixture();
	state.event.data.notificationIntents[0]!.salesId = 99;
	let delivered = false;
	await expect(
		deliverFulfillmentNotificationIntents(state.db, "command-1", async () => {
			delivered = true;
			return 1;
		}),
	).rejects.toThrow("does not match");
	expect(delivered).toBe(false);
});
