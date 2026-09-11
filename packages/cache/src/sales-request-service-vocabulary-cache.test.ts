/// <reference types="bun" />

import { expect, test } from "bun:test";
import {
	SALES_REQUEST_SERVICE_VOCABULARY_ALGORITHM_VERSION,
	SALES_REQUEST_SERVICE_VOCABULARY_CACHE_TTL_SECONDS,
	createSalesRequestServiceVocabularyCache,
	getSalesRequestServiceVocabularyRevision,
} from "./sales-request-service-vocabulary-cache";

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
		values,
		writes,
	};
}

test("keeps service vocabulary in its own scoped, one-hour cache", async () => {
	const { store, writes } = createStore();
	const cache = createSalesRequestServiceVocabularyCache(store);
	const key = { scope: "office:one", limit: 12 };
	const artifact = {
		schemaVersion: 1 as const,
		names: ["INSTALL", "DOOR COPY FEE"],
		generatedAt: "2026-09-11T10:00:00.000Z",
		revision: getSalesRequestServiceVocabularyRevision([
			"INSTALL",
			"DOOR COPY FEE",
		]),
	};

	await cache.set(key, artifact);

	expect(writes[0]?.key).toMatch(/^v1:/);
	expect(writes[0]?.ttlSeconds).toBe(
		SALES_REQUEST_SERVICE_VOCABULARY_CACHE_TTL_SECONDS,
	);
	expect(await cache.get(key)).toEqual(artifact);
	expect(await cache.get({ ...key, scope: "office:two" })).toBeUndefined();
	expect(
		await cache.get({
			...key,
			algorithmVersion: "structured-service-rows-v4",
		}),
	).toBeUndefined();
});

test("rejects malformed artifacts and enforces the requested bound", async () => {
	const { store } = createStore();
	const cache = createSalesRequestServiceVocabularyCache(store);
	const key = { scope: "global", limit: 2 };
	const base = {
		schemaVersion: 1 as const,
		generatedAt: "2026-09-11T10:00:00.000Z",
		revision: getSalesRequestServiceVocabularyRevision(["INSTALL"]),
	};

	await expect(
		cache.set(key, { ...base, names: ["INSTALL", "COPY", "EXTRA"] }),
	).rejects.toThrow("cannot exceed");

	const storageKey = `v1:${encodeURIComponent("global")}:${encodeURIComponent(SALES_REQUEST_SERVICE_VOCABULARY_ALGORITHM_VERSION)}:2`;
	store.set(storageKey, {
		...base,
		names: ["INSTALL", "INSTALL"],
		revision: getSalesRequestServiceVocabularyRevision(["INSTALL"]),
	});
	expect(await cache.get(key)).toBeUndefined();
});

test("revision changes with names or algorithm version, not cache timestamps", () => {
	const names = ["INSTALL", "COPY"];
	const revision = getSalesRequestServiceVocabularyRevision(names);

	expect(revision).toBe(getSalesRequestServiceVocabularyRevision(names));
	expect(revision).not.toBe(
		getSalesRequestServiceVocabularyRevision(["COPY", "INSTALL"]),
	);
	expect(revision).not.toBe(
		getSalesRequestServiceVocabularyRevision(
			names,
			"structured-service-rows-v4",
		),
	);
});
