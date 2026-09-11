/// <reference types="bun" />

import { expect, test } from "bun:test";
import {
	SALES_REQUEST_CONFIGURATION_CACHE_TTL_SECONDS,
	createSalesRequestConfigurationCache,
} from "./sales-request-configuration-cache";

type Write = { key: string; value: unknown; ttlSeconds?: number };

function createStore() {
	const values = new Map<string, unknown>();
	const writes: Write[] = [];
	return {
		store: {
			get: async (key: string) => values.get(key),
			set: async (key: string, value: unknown, ttlSeconds?: number) => {
				writes.push({ key, value, ttlSeconds });
				values.set(key, value);
			},
		},
		writes,
		values,
	};
}

test("encodes scope and revision independently and applies the 24-hour TTL", async () => {
	const { store, writes } = createStore();
	const cache = createSalesRequestConfigurationCache(store);
	const first = {
		scope: "team:one",
		revision: "revision/1",
		content: "first",
	};
	const second = {
		scope: "team",
		revision: "one:revision/1",
		content: "second",
	};

	await cache.set(first);
	await cache.set(second);

	expect(writes[0]?.key).toBeDefined();
	expect(writes[0]?.key).not.toBe(writes[1]?.key);
	expect(writes[0]?.ttlSeconds).toBe(
		SALES_REQUEST_CONFIGURATION_CACHE_TTL_SECONDS,
	);
	expect(await cache.get("team:one", "revision/1")).toEqual(first);
	expect(
		await cache.get({ scope: "team", revision: "one:revision/1" }),
	).toEqual(second);
});

test("treats malformed, wrong-scope, and wrong-revision values as cache misses", async () => {
	const { store, values } = createStore();
	const cache = createSalesRequestConfigurationCache(store);
	const key = "v1:scope:revision";

	values.set(key, {
		scope: "scope",
		revision: "revision",
		content: "ok",
		extra: true,
	});
	expect(await cache.get("scope", "revision")).toBeUndefined();

	values.set(key, {
		scope: "other",
		revision: "revision",
		content: "wrong scope",
	});
	expect(await cache.get("scope", "revision")).toBeUndefined();

	values.set(key, {
		scope: "scope",
		revision: "other",
		content: "wrong revision",
	});
	expect(await cache.get("scope", "revision")).toBeUndefined();

	values.set(key, { scope: "scope", revision: "revision", content: 123 });
	expect(await cache.get("scope", "revision")).toBeUndefined();
});
