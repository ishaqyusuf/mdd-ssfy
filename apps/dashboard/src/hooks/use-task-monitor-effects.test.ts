import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(
	resolve(
		dirname(fileURLToPath(import.meta.url)),
		"use-task-monitor-effects.ts",
	),
	"utf8",
);

describe("task monitor query events", () => {
	it("uses the production event for completed production tasks", () => {
		expect(source.includes("sq.events.productionUpdated(sales)")).toBe(true);
	});

	it("uses the production event when production completion is cancelled", () => {
		expect(source.includes('case "sales.cancel-production-completion"')).toBe(
			true,
		);
	});

	it("uses the fulfillment event for fulfilled sales tasks", () => {
		expect(source.includes("sq.events.fulfillmentUpdated(sales)")).toBe(true);
		expect(source).toContain("waitForFulfillmentProjection");
		expect(
			source.match(/sq\.events\.fulfillmentUpdated\(sales\)/g),
		).toHaveLength(2);
		expect(source).toContain("getBacklogCount(output)");
		expect(source).toContain("workspaceSummary.pathKey()");
	});

	it("invalidates persisted inventory and order state after legacy adaptation", () => {
		expect(source).toContain('case "sales.mark-as-fulfilled"');
		expect(source).toContain('"sales.adapt-legacy-inventory"');
		expect(source).toContain("sq.events.legacyInventoryAdapted");
	});

	it("does not duplicate event targets with local query invalidation", () => {
		expect(source.includes("sq.qc.invalidateQueries")).toBe(false);
		expect(source.includes("sq.invalidate.saleOverview")).toBe(false);
	});
});
