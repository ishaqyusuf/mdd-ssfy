import { expect, test } from "bun:test";
import { normalizeProductionReceivingPolicy } from "./production-receiving-settings.js";

test("worker receiving is disabled unless explicitly enabled", () => {
	for (const value of [
		undefined,
		null,
		{},
		{ workerCanReceiveInbound: "true" },
		{ workerCanReceiveInbound: 1 },
	]) {
		expect(
			normalizeProductionReceivingPolicy(value).workerCanReceiveInbound,
		).toBe(false);
	}
	expect(
		normalizeProductionReceivingPolicy({ workerCanReceiveInbound: true })
			.workerCanReceiveInbound,
	).toBe(true);
});

test("policy revisions reject stale administrators without losing unrelated settings", async () => {
	const { updateProductionReceivingSettings } = await import(
		"./production-receiving-settings.js"
	);
	let meta: any = {
		paymentReview: { enabled: true },
		production: { custom: "keep", workerCanReceiveInbound: false, revision: 2 },
	};
	const events: any[] = [];
	const tx = {
		settings: {
			findFirst: async () => ({ id: 1, meta }),
			update: async ({ data }: any) => {
				meta = data.meta;
			},
		},
		event: {
			create: async ({ data }: any) => {
				events.push(data);
			},
		},
	};
	const db = { $transaction: async (fn: any) => fn(tx) };
	const result = await updateProductionReceivingSettings(
		db as never,
		{ workerCanReceiveInbound: true, expectedRevision: 2 },
		9,
	);
	expect(result.settings.revision).toBe(3);
	expect(meta.paymentReview.enabled).toBe(true);
	expect(meta.production.custom).toBe("keep");
	expect(events[0].userId).toBe(9);
	await expect(
		updateProductionReceivingSettings(
			db as never,
			{ workerCanReceiveInbound: false, expectedRevision: 2 },
			9,
		),
	).rejects.toThrow("changed");
	expect(events.length).toBe(1);
});
