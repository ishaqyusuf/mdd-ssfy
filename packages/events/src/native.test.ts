import { expect, test } from "bun:test";
import { createNativeAnalytics } from "./native";
import type { NativeAnalyticsBatch } from "./native-contract";

test("native analytics records one daily session and preserves release metadata", async () => {
	const values = new Map<string, string>();
	const batches: NativeAnalyticsBatch[] = [];
	let sequence = 0;
	let time = new Date("2026-09-12T10:00:00.000Z");
	const client = createNativeAnalytics({
		project: "gnd-mobile",
		endpoint: "https://api.gnd.test/api/analytics/mobile",
		platform: "android",
		appVersion: "1.4.0",
		appBuild: "104",
		now: () => time,
		createId: () =>
			`00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
		storage: {
			getItem: async (key) => values.get(key) ?? null,
			setItem: async (key, value) => void values.set(key, value),
			removeItem: async (key) => void values.delete(key),
		},
		send: async (batch) => void batches.push(batch),
	});
	await client.init();
	await client.trackScreenView("/jobs/private-id?email=private");
	await client.trackScreenView("/jobs/another-id");
	await client.flush();
	expect(
		batches.flatMap((batch) => batch.events).map((event) => event.name),
	).toEqual(["app_session", "screen_view"]);
	expect(batches[0]?.events[0]).toMatchObject({
		source: "mobile",
		platform: "android",
		appVersion: "1.4.0",
		appBuild: "104",
		route: "/jobs",
	});
	time = new Date("2026-09-13T00:01:00.000Z");
	await client.trackSession("/jobs");
	await client.flush();
	expect(batches.at(-1)?.events[0]?.visitKind).toBe("returning");
	await client.destroy();
});
