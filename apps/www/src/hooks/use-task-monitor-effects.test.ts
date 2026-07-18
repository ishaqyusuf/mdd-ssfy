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

	it("uses the fulfillment event for fulfilled sales tasks", () => {
		expect(source.includes("sq.events.fulfillmentUpdated(sales)")).toBe(true);
	});

	it("does not duplicate event targets with local query invalidation", () => {
		expect(source.includes("sq.qc.invalidateQueries")).toBe(false);
		expect(source.includes("sq.invalidate.saleOverview")).toBe(false);
	});
});
