import { expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import { deliverOrQueueFulfillmentNotices } from "./fulfillment-notice-recovery";

const db = {} as Db;

test("successful delivery does not queue another job", async () => {
	let queued = false;
	expect(
		await deliverOrQueueFulfillmentNotices(
			db,
			"request",
			async () => {
				queued = true;
			},
			async () => ({ activityIds: [1] }),
		),
	).toEqual({ delivered: true, queued: false });
	expect(queued).toBe(false);
});

test("failed delivery queues the original command identity", async () => {
	const queued: string[] = [];
	expect(
		await deliverOrQueueFulfillmentNotices(
			db,
			"request",
			async (id) => {
				queued.push(id);
			},
			async () => {
				throw new Error("Database unavailable");
			},
		),
	).toEqual({ delivered: false, queued: true });
	expect(queued).toEqual(["request"]);
});

test("queue failure remains visible instead of claiming successful recovery", async () => {
	expect(
		await deliverOrQueueFulfillmentNotices(
			db,
			"request",
			async () => {
				throw new Error("Queue unavailable");
			},
			async () => {
				throw new Error("Database unavailable");
			},
		),
	).toEqual({ delivered: false, queued: false });
});
