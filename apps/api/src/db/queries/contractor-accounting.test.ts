import { describe, expect, it } from "bun:test";

import { getContractorPeriodReport } from "./contractor-accounting";

describe("contractor accounting period report query", () => {
	it("builds a January through August statement from earned jobs and payouts", async () => {
		const approvedAt = new Date("2026-01-05T15:00:00.000Z");
		const openingApprovedAt = new Date("2025-12-15T15:00:00.000Z");
		const payoutAt = new Date("2026-08-10T15:00:00.000Z");
		const cancelledPayoutAt = new Date("2026-07-01T15:00:00.000Z");
		const jobsFindManyArgs: unknown[] = [];
		const paymentsFindManyArgs: unknown[] = [];
		const ctx = {
			db: {
				jobs: {
					findMany: async (args: unknown) => {
						jobsFindManyArgs.push(args);
						return [
							{
								id: 101,
								userId: 77,
								amount: 100.25,
								status: "Approved",
								title: "Install doors",
								description: "Main floor installation",
								createdAt: approvedAt,
								approvedAt,
								statusDate: approvedAt,
								user: { id: 77, name: "G&C Interior" },
								project: { id: 9, title: "Keys Gate" },
							},
							{
								id: 100,
								userId: 77,
								amount: 50,
								status: "Paid",
								title: "December trim",
								description: null,
								createdAt: openingApprovedAt,
								approvedAt: openingApprovedAt,
								statusDate: payoutAt,
								user: { id: 77, name: "G&C Interior" },
								project: { id: 9, title: "Keys Gate" },
							},
							{
								id: 99,
								userId: 77,
								amount: 999,
								status: "Rejected",
								title: "Rejected work",
								description: null,
								createdAt: approvedAt,
								approvedAt,
								statusDate: approvedAt,
								user: { id: 77, name: "G&C Interior" },
								project: { id: 9, title: "Keys Gate" },
							},
						];
					},
				},
				jobPayments: {
					findMany: async (args: unknown) => {
						paymentsFindManyArgs.push(args);
						return [
							{
								id: 501,
								amount: 90.15,
								subTotal: 100.25,
								createdAt: payoutAt,
								meta: null,
								userId: 77,
								user: { id: 77, name: "G&C Interior" },
								adjustments: [
									{
										id: 700,
										type: "DEDUCTION",
										amount: 10.1,
										description: "Contractor charge",
										createdAt: payoutAt,
									},
								],
							},
							{
								id: 502,
								amount: 20,
								subTotal: 20,
								createdAt: cancelledPayoutAt,
								meta: {
									cancelledAt: "2026-08-01T15:00:00.000Z",
								},
								userId: 77,
								user: { id: 77, name: "G&C Interior" },
								adjustments: [],
							},
							{
								id: 503,
								amount: 25,
								subTotal: 25,
								createdAt: null,
								meta: null,
								userId: 77,
								user: { id: 77, name: "G&C Interior" },
								adjustments: [],
							},
						];
					},
				},
			},
		};

		const report = await getContractorPeriodReport(ctx as never, {
			from: "2026-01-01",
			to: "2026-08-31",
			timezone: "America/New_York",
			includeEntries: true,
		});

		expect(report.period).toEqual({
			from: "2026-01-01T05:00:00.000Z",
			toExclusive: "2026-09-01T04:00:00.000Z",
			timezone: "America/New_York",
		});
		expect(report.summary).toMatchObject({
			openingBalanceCents: 5000,
			earnedCents: 10025,
			deductionCents: 1010,
			payoutCents: 11015,
			reversalCents: 2000,
			netActivityCents: 0,
			closingBalanceCents: 5000,
			contractorCount: 1,
			jobCount: 1,
			payoutCount: 2,
		});
		expect(report.entries.map((entry) => entry.id)).toEqual([
			"job:101:earned",
			"payment:502:payout",
			"payment:502:reversal",
			"payment:501:adjustment:700",
			"payment:501:payout",
		]);
		expect(report.dataQuality).toEqual({
			source: "legacy-jobs-and-payouts",
			legacyJobDateFallbackCount: 0,
			missingContractorNameCount: 0,
			missingPayoutDateCount: 1,
			cancelledPayoutCount: 1,
			reconciliationDifferenceCents: 0,
		});
		expect(jobsFindManyArgs).toHaveLength(1);
		expect(jobsFindManyArgs[0]).toMatchObject({
			where: {
				status: {
					in: ["Approved", "Completed", "Paid", "Payment Cancelled"],
				},
			},
			take: 50001,
		});
		expect(paymentsFindManyArgs).toHaveLength(1);
		expect(paymentsFindManyArgs[0]).toMatchObject({
			where: {
				OR: [{ createdAt: { lt: expect.any(Date) } }, { createdAt: null }],
			},
			take: 25001,
		});
	});
});
