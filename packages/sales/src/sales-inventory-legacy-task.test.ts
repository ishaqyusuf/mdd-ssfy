import { describe, expect, it } from "bun:test";

import {
	getSalesInventoryLegacyMigrationIdempotencyKey,
	isSalesInventoryLegacyProjectionActivelySyncing,
} from "@gnd/sales/sales-inventory-legacy-task";

describe("legacy inventory task idempotency", () => {
	it("deduplicates the same save while allowing a newer revision", () => {
		const sameSave = {
			salesOrderId: 24057,
			legacyStatus: "AVAILABLE" as const,
			savedOrderUpdatedAt: "2026-08-24T19:57:53.000Z",
		};
		const key = getSalesInventoryLegacyMigrationIdempotencyKey(sameSave);

		expect(getSalesInventoryLegacyMigrationIdempotencyKey(sameSave)).toBe(key);
		expect(
			getSalesInventoryLegacyMigrationIdempotencyKey({
				...sameSave,
				savedOrderUpdatedAt: "2026-08-24T20:01:00.000Z",
			}),
		).not.toBe(key);
	});

	it("deduplicates concurrent retries while allowing a later failed attempt", () => {
		const retry = {
			salesOrderId: 24057,
			legacyStatus: "AVAILABLE" as const,
			savedOrderUpdatedAt: "2026-08-24T19:57:53.000Z",
			retryRevision: "2026-08-24T20:02:00.000Z",
		};
		const key = getSalesInventoryLegacyMigrationIdempotencyKey(retry);
		expect(getSalesInventoryLegacyMigrationIdempotencyKey(retry)).toBe(key);
		expect(
			getSalesInventoryLegacyMigrationIdempotencyKey({
				...retry,
				retryRevision: "2026-08-24T20:03:00.000Z",
			}),
		).not.toBe(key);
	});

	it("treats abandoned syncing projections as retryable after five minutes", () => {
		const now = new Date("2026-08-24T20:10:00.000Z");
		expect(
			isSalesInventoryLegacyProjectionActivelySyncing({
				status: "syncing",
				source: "legacy-status",
				startedAt: "2026-08-24T20:06:00.000Z",
				now,
			}),
		).toBe(true);
		expect(
			isSalesInventoryLegacyProjectionActivelySyncing({
				status: "syncing",
				source: "legacy-status",
				startedAt: "2026-08-24T20:05:00.000Z",
				now,
			}),
		).toBe(false);
	});
});
