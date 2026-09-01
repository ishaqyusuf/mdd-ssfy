import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	bulkMarkSalesFulfilledRequestSchema,
	bulkMarkSalesFulfilledSchema,
} from "./schema";

describe("bulk mark sales fulfilled task contract", () => {
	it("deduplicates request ids and rejects batches above 40", () => {
		const requestId = "a818581e-6e44-43c6-a955-e2e68cc02314";
		expect(
			bulkMarkSalesFulfilledRequestSchema.parse({
				requestId,
				salesIds: [1, 1, 2],
			}),
		).toEqual({ requestId, salesIds: [1, 2] });
		expect(() =>
			bulkMarkSalesFulfilledRequestSchema.parse({
				requestId,
				salesIds: Array.from({ length: 41 }, (_, index) => index + 1),
			}),
		).toThrow("Bulk fulfillment is limited to 40 orders");
	});

	it("requires server-stamped actor metadata", () => {
		expect(() =>
			bulkMarkSalesFulfilledSchema.parse({
				requestId: "a818581e-6e44-43c6-a955-e2e68cc02314",
				salesIds: [1],
			}),
		).toThrow();
	});

	it("uses one durable parent with bounded runtime and idempotent children", () => {
		const source = readFileSync(
			resolve(import.meta.dir, "tasks/sales/bulk-mark-sales-fulfilled.ts"),
			"utf8",
		);
		expect(source).toContain('id: "bulk-mark-sales-fulfilled"');
		expect(source).toContain("maxDuration: 900");
		expect(source).toContain("concurrencyLimit: 2");
		expect(source).toContain("batchTriggerAndWait(batchItems)");
		expect(source).toContain(
			"bulk-mark-sales-fulfilled:${input.requestId}:${item.salesId}",
		);
		expect(source).toContain('idempotencyKeyTTL: "7d"');
		expect(source).toContain("completionRequestId: input.requestId");
	});
});
