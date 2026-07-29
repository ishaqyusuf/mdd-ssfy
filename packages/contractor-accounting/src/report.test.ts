import { describe, expect, it } from "bun:test";

import {
	buildContractorPeriodReport,
	createDateOnlyReportPeriod,
	formatDateOnlyInTimezone,
	formatMoneyCents,
	moneyToCents,
} from "./report";

describe("contractor accounting period reports", () => {
	it("uses cent-safe arithmetic and an end-exclusive January through August period", () => {
		const report = buildContractorPeriodReport({
			period: {
				from: "2026-01-01T00:00:00.000Z",
				toExclusive: "2026-09-01T00:00:00.000Z",
				timezone: "America/New_York",
			},
			entries: [
				{
					id: "opening-earned",
					contractorId: 77,
					contractorName: "G&C Interior",
					type: "JOB_EARNED",
					amount: "50.00",
					effectiveAt: "2025-12-31T23:59:59.999Z",
				},
				{
					id: "january-earned",
					contractorId: 77,
					contractorName: "G&C Interior",
					type: "JOB_EARNED",
					amount: "100.25",
					effectiveAt: "2026-01-01T00:00:00.000Z",
					jobId: 101,
				},
				{
					id: "august-expense",
					contractorId: 77,
					contractorName: "G&C Interior",
					type: "EXPENSE",
					amount: "4.10",
					effectiveAt: "2026-08-31T23:59:59.999Z",
				},
				{
					id: "august-deduction",
					contractorId: 77,
					contractorName: "G&C Interior",
					type: "DEDUCTION",
					amount: "4.00",
					effectiveAt: "2026-08-31T23:59:59.999Z",
				},
				{
					id: "august-payout",
					contractorId: 77,
					contractorName: "G&C Interior",
					type: "PAYOUT",
					amount: "90.15",
					effectiveAt: "2026-08-31T23:59:59.999Z",
					paymentId: 501,
				},
				{
					id: "august-reversal",
					contractorId: 77,
					contractorName: "G&C Interior",
					type: "PAYOUT_REVERSAL",
					amount: "10.00",
					effectiveAt: "2026-08-31T23:59:59.999Z",
					paymentId: 502,
				},
				{
					id: "september-earned",
					contractorId: 77,
					contractorName: "G&C Interior",
					type: "JOB_EARNED",
					amount: "999.00",
					effectiveAt: "2026-09-01T00:00:00.000Z",
				},
			],
		});

		expect(report.summary).toMatchObject({
			openingBalanceCents: 5000,
			earnedCents: 10025,
			expenseCents: 410,
			deductionCents: 400,
			payoutCents: 9015,
			reversalCents: 1000,
			netActivityCents: 2020,
			closingBalanceCents: 7020,
			contractorCount: 1,
			jobCount: 1,
			payoutCount: 2,
		});
		expect(report.entries.map((entry) => entry.id)).not.toContain(
			"september-earned",
		);
		expect(report.contractors[0]).toMatchObject({
			contractorId: 77,
			openingBalanceCents: 5000,
			closingBalanceCents: 7020,
		});
	});

	it("rejects empty or reversed periods", () => {
		expect(() =>
			buildContractorPeriodReport({
				period: {
					from: "2026-09-01T00:00:00.000Z",
					toExclusive: "2026-09-01T00:00:00.000Z",
					timezone: "UTC",
				},
				entries: [],
			}),
		).toThrow("Report period end must be after its start");
	});

	it("parses and formats signed decimal money without floating-point drift", () => {
		expect(moneyToCents("100.25")).toBe(10025);
		expect(moneyToCents("-4.10")).toBe(-410);
		expect(moneyToCents(0.1 + 0.2)).toBe(30);
		expect(formatMoneyCents(-410)).toBe("-4.10");
	});

	it("converts inclusive business dates into timezone-aware UTC boundaries", () => {
		expect(
			createDateOnlyReportPeriod({
				from: "2026-01-01",
				to: "2026-08-31",
				timezone: "America/New_York",
			}),
		).toEqual({
			from: "2026-01-01T05:00:00.000Z",
			toExclusive: "2026-09-01T04:00:00.000Z",
			timezone: "America/New_York",
		});
	});

	it("derives date-only values in the report business timezone", () => {
		expect(
			formatDateOnlyInTimezone("2026-01-01T01:00:00.000Z", "America/New_York"),
		).toBe("2025-12-31");
	});

	it("retains contractors whose period activity nets to zero", () => {
		const report = buildContractorPeriodReport({
			period: {
				from: "2026-01-01T05:00:00.000Z",
				toExclusive: "2026-09-01T04:00:00.000Z",
				timezone: "America/New_York",
			},
			entries: [
				{
					id: "job:1",
					contractorId: 7,
					contractorName: "Balanced Contractor",
					type: "JOB_EARNED",
					amount: 100,
					effectiveAt: "2026-02-01T15:00:00.000Z",
					jobId: 1,
				},
				{
					id: "payout:1",
					contractorId: 7,
					contractorName: "Balanced Contractor",
					type: "PAYOUT",
					amount: 100,
					effectiveAt: "2026-03-01T15:00:00.000Z",
					paymentId: 1,
				},
			],
		});

		expect(report.summary.closingBalanceCents).toBe(0);
		expect(report.contractors).toHaveLength(1);
		expect(report.contractors[0]).toMatchObject({
			contractorName: "Balanced Contractor",
			jobCount: 1,
			payoutCount: 1,
			closingBalanceCents: 0,
		});
	});
});
