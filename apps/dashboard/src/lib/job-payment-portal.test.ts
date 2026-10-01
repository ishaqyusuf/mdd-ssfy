import { describe, expect, it } from "bun:test";
import {
	getHandoffSelection,
	getJobPaymentHandoff,
	positiveId,
	readJobPaymentContext,
} from "./job-payment-portal";

const context = (query: string) =>
	readJobPaymentContext(new URLSearchParams(query));
const job = { id: 101, user: { id: 7 }, status: "Approved" };

describe("job to payment portal handoff", () => {
	it("carries the contractor, job and correct view without making a payment", () => {
		expect(getJobPaymentHandoff(job)?.href).toBe(
			"/contractors/jobs/payment-portal?contractorId=7&jobId=101&status=ready-to-pay",
		);
		expect(
			getJobPaymentHandoff({ ...job, status: "Submitted" })?.isReview,
		).toBe(true);
		expect(
			getJobPaymentHandoff({ ...job, status: "Payment Cancelled" })?.href,
		).toContain("status=payment-cancelled");
	});
	it("keeps paid, linked, assigned and missing-contractor jobs out of the prepare-payment path", () => {
		for (const changed of [
			{ status: "Paid" },
			{ status: "Assigned" },
			{ payment: { id: 8 } },
			{ user: null },
		])
			expect(getJobPaymentHandoff({ ...job, ...changed })).toBe(null);
	});
	it("rejects malformed or unsafe identifiers and unsupported status context", () => {
		for (const value of [
			"",
			"-1",
			"0",
			"1.5",
			"1e3",
			"0xff",
			"abc",
			"9007199254740992",
			null,
			true,
		])
			expect(positiveId(value)).toBe(null);
		expect(context("contractorId=7&jobId=101&status=paid").status).toBe("all");
		expect(context("contractorId=invalid&jobId=101").jobId).toBe(null);
	});
	it("selects only a current unpaid job in the matching contractor response", () => {
		const target = context("contractorId=7&jobId=101&status=ready-to-pay");
		const jobs = [
			{ id: 101, status: "Approved", paymentStage: "ready-to-pay" },
		];
		expect(getHandoffSelection(target, 7, jobs)).toBe(101);
		expect(getHandoffSelection(target, 8, jobs)).toBe(null);
		expect(getHandoffSelection(target, 7, [])).toBe(null);
		expect(
			getHandoffSelection(target, 7, [{ ...jobs[0], status: "Paid" }]),
		).toBe(null);
		expect(
			getHandoffSelection(target, 7, [
				{ ...jobs[0], status: "Assigned", paymentStage: "not-payable" },
			]),
		).toBe(null);
	});
	it("opens submitted work for review without preselecting it for a payout", () => {
		expect(
			getHandoffSelection(
				context("contractorId=7&jobId=101&status=pending-review"),
				7,
				[{ id: 101, status: "Submitted", paymentStage: "pending-review" }],
			),
		).toBe(null);
	});
	it("permits repayment context only when the cancelled job remains in the unpaid response", () => {
		const target = context("contractorId=7&jobId=101&status=payment-cancelled");
		expect(
			getHandoffSelection(target, 7, [
				{ id: 101, status: "Payment Cancelled", paymentStage: "not-payable" },
			]),
		).toBe(101);
		expect(
			getHandoffSelection(target, 7, [
				{ id: 101, status: "Payment Cancelled", paymentStage: null },
			]),
		).toBe(null);
	});
});
