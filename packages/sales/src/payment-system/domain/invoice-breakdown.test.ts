import { describe, expect, it } from "bun:test";

import { composeSalesOverviewFinancialBreakdown } from "./invoice-breakdown";

describe("sales overview financial breakdown", () => {
	it("keeps invoice truth separate from grouped card settlement", () => {
		const breakdown = composeSalesOverviewFinancialBreakdown({
			documentType: "order",
			subtotalCents: 229_846,
			adjustments: [],
			taxes: [
				{
					key: "tax-county-state",
					label: "County & State Tax",
					amountCents: 16_089,
				},
			],
			totalCents: 245_935,
			paidCents: 245_935,
			refundedCents: 0,
			balanceCents: 0,
			paymentSummary: {
				paymentCount: 2,
				principalCents: 245_935,
				cccCents: 7_378,
				tipCents: 0,
				customerChargedCents: 253_313,
				methodLabel: "Credit Card",
				groups: [
					{
						method: "card",
						label: "Card",
						paymentCount: 2,
						principalCents: 245_935,
						cccCents: 7_378,
						tipCents: 0,
						customerChargedCents: 253_313,
						cccEvidence: "recorded",
					},
				],
			},
		});

		expect(breakdown.invoice).toEqual({
			subtotalCents: 229_846,
			adjustments: [],
			taxes: [
				{
					key: "tax-county-state",
					label: "County & State Tax",
					amountCents: 16_089,
				},
			],
			totalCents: 245_935,
			paidCents: 245_935,
			refundedCents: 0,
			balanceCents: 0,
		});
		expect(breakdown.paymentGroups).toHaveLength(1);
		expect(breakdown.paymentGroups[0]).toMatchObject({
			method: "card",
			paymentCount: 2,
			principalCents: 245_935,
			cccCents: 7_378,
			customerChargedCents: 253_313,
		});
		expect(breakdown.pendingCardEstimate).toBeNull();
	});

	it("omits empty detail rows and keeps an unpaid card estimate explicit", () => {
		const breakdown = composeSalesOverviewFinancialBreakdown({
			documentType: "order",
			subtotalCents: 162_105,
			adjustments: [{ key: "empty", label: "Empty", amountCents: 0 }],
			taxes: [{ key: "tax", label: "Tax", amountCents: 10_605 }],
			totalCents: 162_105,
			paidCents: 0,
			balanceCents: 162_105,
			paymentSummary: null,
			pendingCardEstimate: {
				principalCents: 162_105,
				cccCents: 4_863,
				totalCents: 166_968,
			},
		});

		expect(breakdown.invoice.adjustments).toEqual([]);
		expect(breakdown.paymentGroups).toEqual([]);
		expect(breakdown.pendingCardEstimate).toEqual({
			principalCents: 162_105,
			cccCents: 4_863,
			totalCents: 166_968,
		});
	});

	it("keeps a remaining-card estimate beside prior payment groups", () => {
		const breakdown = composeSalesOverviewFinancialBreakdown({
			documentType: "order",
			subtotalCents: 100_000,
			adjustments: [],
			taxes: [],
			totalCents: 100_000,
			paidCents: 40_000,
			balanceCents: 60_000,
			paymentSummary: {
				paymentCount: 1,
				principalCents: 40_000,
				cccCents: 0,
				tipCents: 0,
				customerChargedCents: 40_000,
				methodLabel: "Cash",
				groups: [
					{
						method: "cash",
						label: "Cash",
						paymentCount: 1,
						principalCents: 40_000,
						cccCents: 0,
						tipCents: 0,
						customerChargedCents: 40_000,
						cccEvidence: "unavailable",
					},
				],
			},
			pendingCardEstimate: {
				principalCents: 60_000,
				cccCents: 1_800,
				totalCents: 61_800,
			},
		});

		expect(breakdown.paymentGroups).toHaveLength(1);
		expect(breakdown.pendingCardEstimate).toEqual({
			principalCents: 60_000,
			cccCents: 1_800,
			totalCents: 61_800,
		});
	});

	it("never exposes payment settlement rows for a quote", () => {
		const breakdown = composeSalesOverviewFinancialBreakdown({
			documentType: "quote",
			subtotalCents: 10_000,
			adjustments: [],
			taxes: [],
			totalCents: 10_000,
			paidCents: 0,
			balanceCents: 10_000,
			paymentSummary: {
				paymentCount: 1,
				principalCents: 10_000,
				cccCents: 0,
				tipCents: 0,
				customerChargedCents: 10_000,
				methodLabel: "Cash",
				groups: [
					{
						method: "cash",
						label: "Cash",
						paymentCount: 1,
						principalCents: 10_000,
						cccCents: 0,
						tipCents: 0,
						customerChargedCents: 10_000,
						cccEvidence: "unavailable",
					},
				],
			},
		});

		expect(breakdown.paymentGroups).toEqual([]);
		expect(breakdown.pendingCardEstimate).toBeNull();
	});
});
