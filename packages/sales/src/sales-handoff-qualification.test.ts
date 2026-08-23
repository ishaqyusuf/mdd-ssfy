import { describe, expect, test } from "bun:test";
import type { SalesHandoffTriggerPolicy } from "@gnd/settings";
import {
	type SalesHandoffPaymentFacts,
	qualifySalesHandoff,
} from "./sales-handoff-qualification";

const policy = (
	overrides: Partial<SalesHandoffTriggerPolicy> = {},
): SalesHandoffTriggerPolicy => ({
	mode: "FULLY_PAID",
	percentage: null,
	revision: 2,
	changedAt: "2026-08-23T12:00:00.000Z",
	...overrides,
});

const payment = (
	overrides: Partial<SalesHandoffPaymentFacts> = {},
): SalesHandoffPaymentFacts => ({
	orderType: "order",
	lifecycle: "ACTIVE",
	paymentTerm: "Due on receipt",
	projection: {
		salesOrderId: 91,
		grandTotal: 100,
		totalAllocated: 0,
		totalRefunded: 0,
		totalVoided: 0,
		amountDue: 100,
	},
	settlementTimeline: [],
	...overrides,
});

describe("sales handoff payment qualification", () => {
	test("fully paid requires a positive total and canonical non-positive amount due", () => {
		expect(
			qualifySalesHandoff({
				policy: policy(),
				payment: payment({
					projection: {
						...payment().projection,
						totalAllocated: 100,
						amountDue: 0,
					},
					fullyPaidAt: "2026-08-23T11:00:00.000Z",
				}),
			}),
		).toMatchObject({
			qualified: true,
			qualifiedAt: "2026-08-23T12:00:00.000Z",
		});
		expect(
			qualifySalesHandoff({
				policy: policy(),
				payment: payment({
					projection: {
						...payment().projection,
						grandTotal: 0,
						amountDue: 0,
					},
				}),
			}),
		).toMatchObject({ qualified: false, reason: "ZERO_TOTAL_EXCLUDED" });
	});

	test("uses canonical refund and void totals without reclassifying raw receipt statuses", () => {
		const result = qualifySalesHandoff({
			policy: policy({ mode: "ANY_PAYMENT" }),
			payment: payment({
				projection: {
					...payment().projection,
					totalAllocated: 100,
					totalRefunded: 70,
					totalVoided: 25,
					amountDue: 95,
				},
			}),
		});
		expect(result).toMatchObject({
			qualified: true,
			netReceiptsCents: 500,
		});
	});

	test("duplicate receipt representations with one canonical identity do not change qualification", () => {
		const facts = payment({
			projection: {
				...payment().projection,
				totalAllocated: 10,
				amountDue: 90,
			},
			settlementTimeline: [
				{
					id: "allocation-pay-1",
					netSettledAmount: 10,
					occurredAt: "2026-08-20T09:00:00.000Z",
				},
				{
					id: "allocation-pay-1",
					netSettledAmount: 10,
					occurredAt: "2026-08-20T09:00:00.000Z",
				},
			],
		});

		expect(
			qualifySalesHandoff({
				policy: policy({ mode: "ANY_PAYMENT", changedAt: null }),
				payment: facts,
			}),
		).toMatchObject({
			qualified: true,
			qualifiedAt: "2026-08-20T09:00:00.000Z",
			netReceiptsCents: 1_000,
		});
	});

	test("compares percentage thresholds in integer cents from the canonical projection", () => {
		const result = qualifySalesHandoff({
			policy: policy({ mode: "PAYMENT_PERCENTAGE", percentage: 33 }),
			payment: payment({
				projection: {
					...payment().projection,
					grandTotal: 100.01,
					totalAllocated: 33.01,
					amountDue: 67,
				},
			}),
		});
		expect(result).toMatchObject({
			qualified: true,
			netReceiptsCents: 3_301,
		});
	});

	test("excludes COD, quotes, cancelled, and terminal orders", () => {
		for (const facts of [
			payment({ paymentTerm: "COD" }),
			payment({ orderType: "quote" }),
			payment({ lifecycle: "CANCELLED" }),
			payment({ lifecycle: "TERMINAL" }),
		]) {
			expect(
				qualifySalesHandoff({
					policy: policy({ mode: "ANY_PAYMENT" }),
					payment: {
						...facts,
						projection: {
							...facts.projection,
							totalAllocated: 100,
							amountDue: 0,
						},
					},
				}).qualified,
			).toBe(false);
		}
	});

	test("uses the policy change time for already-settled orders newly exposed by policy", () => {
		const result = qualifySalesHandoff({
			policy: policy({
				mode: "ANY_PAYMENT",
				changedAt: "2026-08-23T12:00:00.000Z",
			}),
			payment: payment({
				projection: {
					...payment().projection,
					totalAllocated: 10,
					amountDue: 90,
				},
				settlementTimeline: [
					{
						id: "allocation-pay-1",
						netSettledAmount: 10,
						occurredAt: "2026-08-20T09:00:00.000Z",
					},
				],
			}),
		});
		expect(result.qualifiedAt).toBe("2026-08-23T12:00:00.000Z");
	});
});
