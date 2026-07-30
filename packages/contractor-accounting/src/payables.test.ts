import { describe, expect, test } from "bun:test";
import { buildContractorPayables } from "./payables";

describe("contractor payables", () => {
	test("cross-foots balances, aging, blockers, and payment handoff job ids", () => {
		const result = buildContractorPayables({
			asOf: "2026-08-31T23:59:59.999Z",
			entries: [
				{
					id: "earn-1",
					contractorId: 1,
					contractorName: "A Contractor",
					type: "JOB_EARNED",
					amount: "1000.00",
					liabilityDelta: "1000.00",
					effectiveAt: "2026-05-01T00:00:00.000Z",
					jobId: 11,
				},
				{
					id: "payout-1",
					contractorId: 1,
					contractorName: "A Contractor",
					type: "PAYOUT",
					amount: "250.00",
					liabilityDelta: "-250.00",
					effectiveAt: "2026-08-01T00:00:00.000Z",
					paymentId: 91,
				},
				{
					id: "earn-2",
					contractorId: 2,
					contractorName: "B Contractor",
					type: "JOB_EARNED",
					amount: "500.00",
					liabilityDelta: "500.00",
					effectiveAt: "2026-08-15T00:00:00.000Z",
					jobId: 22,
				},
			],
			blockersByContractor: new Map([
				[1, { openIssueCount: 1, w9Status: "VERIFIED" }],
				[2, { openIssueCount: 0, w9Status: "VERIFIED" }],
			]),
		});

		expect(result.summary.totalPayableCents).toBe(125_000);
		expect(result.summary.totalBalanceCents).toBe(125_000);
		expect(result.summary.readyCount).toBe(1);
		expect(result.summary.blockedCount).toBe(1);
		expect(result.data[0]?.jobIds).toEqual([11]);
		expect(result.data[0]?.aging.over90DaysCents).toBe(75_000);
		expect(result.data[0]?.readiness).toBe("BLOCKED_RECONCILIATION");
	});

	test("treats a missing W-9 profile as a payout blocker", () => {
		const result = buildContractorPayables({
			asOf: "2026-08-31T23:59:59.999Z",
			entries: [
				{
					id: "earn-1",
					contractorId: 1,
					contractorName: "A Contractor",
					type: "JOB_EARNED",
					amount: "100.00",
					liabilityDelta: "100.00",
					effectiveAt: "2026-08-01T00:00:00.000Z",
					jobId: 11,
				},
			],
		});
		expect(result.data[0]?.readiness).toBe("BLOCKED_TAX");
	});
});
