// @ts-nocheck -- Bun's matcher declarations are not part of the dashboard tsc environment.
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("sales bulk production completion UI contract", () => {
	it("starts one monitored batch and refreshes only after terminal completion", () => {
		const source = readFileSync(
			resolve(import.meta.dir, "sales-menu.tsx"),
			"utf8",
		);
		const start = source.indexOf("const startMarkProductionCompletedTask");
		const end = source.indexOf("const startMarkFulfilledTask", start);
		const productionAction = source.slice(start, end);

		expect(productionAction).toContain(
			'taskName: "bulk-mark-sales-production-completed"',
		);
		expect(productionAction).toContain("requestId: crypto.randomUUID()");
		expect(productionAction).not.toContain("for (const salesId");
		expect(productionAction).not.toContain("invalidateOrders()");
		expect(source).toContain("Bulk production completion finished");
		expect(source).toContain("void invalidateOrders().finally");
	});
});
