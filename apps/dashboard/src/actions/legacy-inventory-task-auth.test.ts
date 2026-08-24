import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./trigger-task.ts", import.meta.url),
	"utf8",
);

describe("legacy inventory task queue boundary", () => {
	it("validates the save baseline and replaces client actor identity", () => {
		expect(
			source.includes(
				'params.taskName === "migrate-sales-inventory-legacy-status"',
			),
		).toBe(true);
		expect(
			source.includes("queueSalesInventoryLegacyStatusMigrationSchema.parse"),
		).toBe(true);
		expect(source.includes("actor.can?.editOrders")).toBe(true);
		expect(source.includes("id: actor.userId")).toBe(true);
		expect(source.includes("name: actor.name")).toBe(true);
		expect(source.includes("updatedAt: expectedSalesUpdatedAt")).toBe(true);
	});

	it("uses global same-save idempotency and persists start failures", () => {
		expect(
			source.includes("getSalesInventoryLegacyMigrationIdempotencyKey"),
		).toBe(true);
		expect(source.includes('{ scope: "global" }')).toBe(true);
		expect(source.includes('idempotencyKeyTTL: "7d"')).toBe(true);
		expect(
			source.includes("writeSalesInventoryProjectionFailureIfCurrent"),
		).toBe(true);
	});
});
