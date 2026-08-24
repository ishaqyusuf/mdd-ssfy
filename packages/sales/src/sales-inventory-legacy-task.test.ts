import { describe, expect, it } from "bun:test";

import { getSalesInventoryLegacyMigrationIdempotencyKey } from "@gnd/sales/sales-inventory-legacy-task";

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
});
