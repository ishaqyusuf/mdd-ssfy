import { describe, expect, it } from "bun:test";

import { reconcileContractorPeriodReports } from "./reconciliation";
import {
	type ContractorPeriodReportInput,
	buildContractorPeriodReport,
} from "./report";

describe("contractor accounting reconciliation", () => {
	it("reports contractor and summary differences", () => {
		const base: ContractorPeriodReportInput = {
			period: {
				from: "2026-01-01T00:00:00.000Z",
				toExclusive: "2026-02-01T00:00:00.000Z",
				timezone: "UTC",
			},
			entries: [
				{
					id: "job:1",
					contractorId: 1,
					contractorName: "A",
					type: "JOB_EARNED",
					amount: "100.00",
					effectiveAt: "2026-01-02T00:00:00.000Z",
				},
			],
		};
		const expected = buildContractorPeriodReport(base);
		const firstEntry = base.entries[0];
		if (!firstEntry) throw new Error("Expected reconciliation fixture entry");
		const actual = buildContractorPeriodReport({
			...base,
			entries: [{ ...firstEntry, amount: "99.00" }],
		});
		const result = reconcileContractorPeriodReports(expected, actual);
		expect(result.matches).toBe(false);
		expect(result.differences).toEqual([
			{
				code: "SUMMARY_MISMATCH",
				expectedCents: 10000,
				actualCents: 9900,
				differenceCents: -100,
			},
			{
				code: "CONTRACTOR_MISMATCH",
				contractorId: 1,
				expectedCents: 10000,
				actualCents: 9900,
				differenceCents: -100,
			},
		]);
	});
});
