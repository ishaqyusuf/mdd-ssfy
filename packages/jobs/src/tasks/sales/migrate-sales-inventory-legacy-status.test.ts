import { describe, expect, it } from "bun:test";
import type { Db } from "@gnd/db";

import { runMigrateSalesInventoryLegacyStatus } from "./migrate-sales-inventory-legacy-status";

const payload = {
	salesOrderId: 24057,
	legacyStatus: "AVAILABLE" as const,
	savedOrderUpdatedAt: "2026-08-24T19:57:53.000Z",
	actor: { id: 7, name: "Pablo" },
};

function makeDb(current = true) {
	return {
		salesOrders: {
			findFirst: async () =>
				current
					? { id: payload.salesOrderId, inventoryStatus: " available " }
					: null,
		},
	} as unknown as Db;
}

describe("migrate-sales-inventory-legacy-status worker", () => {
	it("rechecks editOrders before resolving the migration", async () => {
		const calls: string[] = [];

		await expect(
			runMigrateSalesInventoryLegacyStatus(makeDb(), payload, {
				hasPermission: async (_db, userId, permission) => {
					calls.push(`permission:${userId}:${permission}`);
					return false;
				},
				writeFailure: async () => {
					calls.push("failure");
					return true;
				},
				writeSyncing: async () => {
					calls.push("syncing");
					return true;
				},
				resolveMigration: async () => {
					calls.push("resolve");
					return {} as never;
				},
			}),
		).rejects.toThrow("no longer has permission");

		expect(calls).toEqual(["permission:7:editOrders", "failure"]);
	});

	it("exits stale before projection failure, inventory, inbound, or history work", async () => {
		const calls: string[] = [];
		const result = await runMigrateSalesInventoryLegacyStatus(
			makeDb(false),
			payload,
			{
				hasPermission: async () => true,
				writeFailure: async () => {
					calls.push("failure");
					return true;
				},
				writeSyncing: async () => {
					calls.push("syncing");
					return true;
				},
				resolveMigration: async () => {
					calls.push("resolve");
					return {} as never;
				},
			},
		);

		expect(result).toEqual({ result: "stale", salesOrderId: 24057 });
		expect(calls).toEqual([]);
	});

	it("passes the exact revision and server-owned actor into the resolver", async () => {
		let migrationInput: Record<string, unknown> | null = null;
		const result = await runMigrateSalesInventoryLegacyStatus(
			makeDb(),
			payload,
			{
				hasPermission: async () => true,
				writeFailure: async () => true,
				writeSyncing: async () => true,
				resolveMigration: async (_db, input) => {
					migrationInput = input as unknown as Record<string, unknown>;
					return { result: "migrated" } as never;
				},
			},
		);

		expect(result as unknown).toEqual({ result: "migrated" });
		const capturedInput = migrationInput as unknown as Record<string, unknown>;
		expect(capturedInput).toMatchObject({
			salesOrderId: 24057,
			action: "continue",
			legacyStatus: "AVAILABLE",
			authorName: "Pablo",
			triggeredByUserId: 7,
		});
		expect((capturedInput.expectedSalesUpdatedAt as Date).toISOString()).toBe(
			payload.savedOrderUpdatedAt,
		);
	});

	it("persists a bounded failure state before allowing Trigger retries", async () => {
		const failures: unknown[] = [];
		await expect(
			runMigrateSalesInventoryLegacyStatus(makeDb(), payload, {
				hasPermission: async () => true,
				writeSyncing: async () => true,
				resolveMigration: async () => {
					throw new Error("temporary supplier service failure");
				},
				writeFailure: async (_db, input) => {
					failures.push(input);
					return true;
				},
			}),
		).rejects.toThrow("temporary supplier service failure");

		expect(failures).toHaveLength(1);
		expect(failures[0]).toMatchObject({
			salesOrderId: 24057,
			legacyStatus: "AVAILABLE",
			source: "legacy-status",
		});
	});
});
