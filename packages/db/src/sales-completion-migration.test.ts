// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migrationPath = new URL(
	"./migrations/20260901200350_add_sales_completion_record/migration.sql",
	import.meta.url,
);
const salesSchemaPath = new URL("./schema/sales.prisma", import.meta.url);

const migration = readFileSync(migrationPath, "utf8");
const salesSchema = readFileSync(salesSchemaPath, "utf8");

describe("status-only sales completion database contract", () => {
	test("creates an append-only completion record with idempotency and one-active-record constraints", () => {
		expect(migration).toContain("CREATE TABLE `SalesCompletionRecord`");
		expect(migration).toContain(
			"UNIQUE INDEX `SalesCompletionRecord_requestId_key`(`requestId`)",
		);
		expect(migration).toContain(
			"UNIQUE INDEX `SalesCompletionRecord_cancellationRequestId_key`(`cancellationRequestId`)",
		);
		expect(migration).toContain(
			"UNIQUE INDEX `SalesCompletionRecord_activeKey_key`(`activeKey`)",
		);
		expect(salesSchema).toContain("model SalesCompletionRecord {");
		expect(salesSchema).toContain(
			"order                 SalesOrders                @relation(fields: [salesOrderId], references: [id], onDelete: Restrict)",
		);
	});

	test("seeds the exact independent permission rows without assigning them to roles", () => {
		expect(migration).toContain("'view status only sales completion'");
		expect(migration).toContain("'edit status only sales completion'");
		expect(migration).toContain("WHERE NOT EXISTS");
		expect(migration).not.toMatch(/RolePermissions|PermissionsOnRoles/i);
	});

	test("does not seed completion records or mutate operational workflow tables", () => {
		expect(migration).not.toMatch(/INSERT\s+INTO\s+`SalesCompletionRecord`/i);

		for (const operationalTable of [
			"SalesStat",
			"QtyControl",
			"Inventory",
			"Dispatch",
			"Production",
			"SalesOrders",
		]) {
			expect(migration).not.toMatch(
				new RegExp(
					`(?:INSERT|UPDATE|DELETE|ALTER)\\s+(?:INTO\\s+|FROM\\s+|TABLE\\s+)?\\\`${operationalTable}\\\``,
					"i",
				),
			);
		}
	});
});
