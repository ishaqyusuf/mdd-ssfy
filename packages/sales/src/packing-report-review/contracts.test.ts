import { describe, expect, it } from "bun:test";

import { decidePackingReportsSchema } from "./contracts";

describe("packing report batch decision contract", () => {
	it("accepts one decision for multiple uniquely versioned reports", () => {
		const decidedAt = new Date("2026-08-28T18:00:00.000Z");
		expect(
			decidePackingReportsSchema.parse({
				reports: [
					{ reportId: 8, expectedUpdatedAt: decidedAt },
					{ reportId: 9, expectedUpdatedAt: decidedAt },
				],
				action: "APPROVE",
				note: "Approved as one dispatch packing batch.",
			}).reports,
		).toHaveLength(2);
	});

	it("rejects empty and duplicate report batches", () => {
		const decidedAt = new Date("2026-08-28T18:00:00.000Z");
		expect(
			decidePackingReportsSchema.safeParse({
				reports: [],
				action: "REJECT",
				note: "Rejected.",
			}).success,
		).toBe(false);
		expect(
			decidePackingReportsSchema.safeParse({
				reports: [
					{ reportId: 8, expectedUpdatedAt: decidedAt },
					{ reportId: 8, expectedUpdatedAt: decidedAt },
				],
				action: "REJECT",
				note: "Rejected.",
			}).success,
		).toBe(false);
	});
});
