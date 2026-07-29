import { describe, expect, it } from "bun:test";
import type { ContractorPeriodReport } from "@gnd/contractor-accounting";

import { buildContractorAccountingExport } from "./contractor-accounting-export";

describe("contractor accounting report export", () => {
	it("uses the reviewed report dataset for summary, contractor, and detail sheets", () => {
		const report: ContractorPeriodReport = {
			period: {
				from: "2026-01-01T05:00:00.000Z",
				toExclusive: "2026-09-01T04:00:00.000Z",
				timezone: "America/New_York",
			},
			summary: {
				openingBalanceCents: 5000,
				earnedCents: 10025,
				bonusCents: 0,
				expenseCents: 410,
				deductionCents: 400,
				payoutCents: 9015,
				reversalCents: 1000,
				netActivityCents: 2020,
				closingBalanceCents: 7020,
				jobCount: 1,
				payoutCount: 1,
				contractorCount: 1,
			},
			contractors: [
				{
					contractorId: 77,
					contractorName: "G&C Interior",
					openingBalanceCents: 5000,
					earnedCents: 10025,
					bonusCents: 0,
					expenseCents: 410,
					deductionCents: 400,
					payoutCents: 9015,
					reversalCents: 1000,
					netActivityCents: 2020,
					closingBalanceCents: 7020,
					jobCount: 1,
					payoutCount: 1,
				},
			],
			entries: [
				{
					id: "job:101:earned",
					contractorId: 77,
					contractorName: "G&C Interior",
					type: "JOB_EARNED",
					amountCents: 10025,
					signedAmountCents: 10025,
					effectiveAt: "2026-01-05T15:00:00.000Z",
					description: "Install doors",
					jobId: 101,
					projectId: 9,
					projectTitle: "Keys Gate",
				},
			],
		};

		const result = buildContractorAccountingExport(report, {
			from: "2026-01-01",
			to: "2026-08-31",
		});

		expect(result.filename).toBe(
			"contractor-accounting-2026-01-01-to-2026-08-31.xlsx",
		);
		expect(result.summaryRows).toContainEqual({
			Metric: "Closing balance",
			Amount: 70.2,
		});
		expect(result.contractorRows[0]).toMatchObject({
			Contractor: "G&C Interior",
			Earned: 100.25,
			Paid: 90.15,
			"Closing balance": 70.2,
		});
		expect(result.entryRows[0]).toMatchObject({
			Date: "2026-01-05",
			Contractor: "G&C Interior",
			Type: "Job earned",
			Amount: 100.25,
			Effect: 100.25,
			Project: "Keys Gate",
			"Job ID": 101,
		});
	});
});
