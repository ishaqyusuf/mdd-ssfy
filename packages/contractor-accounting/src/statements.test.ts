import { describe, expect, it } from "bun:test";

import { buildContractorPeriodReport } from "./report";
import { buildContractorAging } from "./statements";

describe("contractor statements", () => {
	it("applies payouts FIFO across aging buckets", () => {
		const result = buildContractorAging(
			[
				{
					id: "old",
					contractorId: 1,
					contractorName: "A",
					type: "JOB_EARNED",
					amount: "100.00",
					effectiveAt: "2026-01-01T00:00:00.000Z",
				},
				{
					id: "recent",
					contractorId: 1,
					contractorName: "A",
					type: "JOB_EARNED",
					amount: "50.00",
					effectiveAt: "2026-03-20T00:00:00.000Z",
				},
				{
					id: "payment",
					contractorId: 1,
					contractorName: "A",
					type: "PAYOUT",
					amount: "80.00",
					effectiveAt: "2026-03-25T00:00:00.000Z",
				},
			],
			"2026-04-10T00:00:00.000Z",
		);
		expect(result).toMatchObject({
			days1To30Cents: 5000,
			over90DaysCents: 2000,
			totalCents: 7000,
		});
	});

	it("uses persisted signed liability deltas for reversals", () => {
		const result = buildContractorAging(
			[
				{
					id: "earned",
					contractorId: 1,
					contractorName: "A",
					type: "JOB_EARNED",
					amount: "1000.00",
					liabilityDelta: "1000.00",
					effectiveAt: "2026-08-01T12:00:00.000Z",
				},
				{
					id: "payout-reversal",
					contractorId: 1,
					contractorName: "A",
					type: "REVERSAL",
					amount: "200.00",
					liabilityDelta: "-200.00",
					effectiveAt: "2026-08-15T12:00:00.000Z",
				},
			],
			"2026-08-31T23:59:59.999Z",
		);

		expect(result.totalCents).toBe(80_000);
	});

	it("ages normalized report entries without reconstructing decimal fields", () => {
		const report = buildContractorPeriodReport({
			period: {
				from: "2026-08-01T00:00:00.000Z",
				toExclusive: "2026-09-01T00:00:00.000Z",
				timezone: "UTC",
			},
			entries: [
				{
					id: "earned",
					contractorId: 1,
					contractorName: "A",
					type: "JOB_EARNED",
					amount: "1000.00",
					liabilityDelta: "1000.00",
					effectiveAt: "2026-08-01T12:00:00.000Z",
				},
				{
					id: "reversal",
					contractorId: 1,
					contractorName: "A",
					type: "REVERSAL",
					amount: "200.00",
					liabilityDelta: "-200.00",
					effectiveAt: "2026-08-15T12:00:00.000Z",
				},
			],
		});

		expect(
			buildContractorAging(report.entries, "2026-08-31T23:59:59.999Z")
				.totalCents,
		).toBe(80_000);
	});
});
