import { describe, expect, test } from "bun:test";
import { buildContractorAccountingTrend } from "./analytics";

describe("contractor accounting insights", () => {
	test("fills continuous daily periods and carries closing liability", () => {
		const result = buildContractorAccountingTrend({
			from: "2026-01-01T00:00:00.000Z",
			toExclusive: "2026-01-04T00:00:00.000Z",
			entries: [
				{
					id: "opening",
					contractorId: 1,
					contractorName: "A",
					type: "OPENING_BALANCE",
					amount: "100.00",
					liabilityDelta: "100.00",
					effectiveAt: "2025-12-31T00:00:00.000Z",
				},
				{
					id: "earned",
					contractorId: 1,
					contractorName: "A",
					type: "JOB_EARNED",
					amount: "50.00",
					liabilityDelta: "50.00",
					effectiveAt: "2026-01-02T00:00:00.000Z",
				},
			],
		});
		expect(result.interval).toBe("day");
		expect(result.points).toHaveLength(3);
		expect(result.points.map((point) => point.closingBalanceCents)).toEqual([
			10_000, 15_000, 15_000,
		]);
	});
});
