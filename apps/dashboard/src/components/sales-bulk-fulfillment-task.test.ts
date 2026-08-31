// @ts-nocheck -- Bun's matcher declarations are not part of the dashboard tsc environment.
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const componentsDir = dirname(fileURLToPath(import.meta.url));

describe("sales bulk fulfillment UI contract", () => {
	it("starts one monitored batch and refreshes only after terminal completion", () => {
		const source = readFileSync(
			resolve(componentsDir, "sales-menu.tsx"),
			"utf8",
		);
		const start = source.indexOf("const startMarkFulfilledTask");
		const end = source.indexOf("const prepareStatusAction", start);
		const fulfilledAction = source.slice(start, end);

		expect(fulfilledAction).toContain('taskName: "bulk-mark-sales-fulfilled"');
		expect(fulfilledAction).toContain("requestId: crypto.randomUUID()");
		expect(fulfilledAction).not.toContain("for (const salesId");
		expect(fulfilledAction).not.toContain("invalidateOrders()");
		expect(source).toContain("onSuccess(run)");
		expect(source).toContain("void invalidateOrders()");
	});

	it("reconciles the analytics count from the refreshed Backlog query", () => {
		const source = readFileSync(
			resolve(componentsDir, "tables-2/dispatch-backlog/data-table.tsx"),
			"utf8",
		);

		expect(source).toContain("query.data.pages[0]?.meta as");
		expect(source).toContain("Number(backlogMeta?.count)");
		expect(source).toContain("workspaceSummary.pathKey()");
		expect(source).toContain("backlog: backlogCount");
	});
});
