import { describe, expect, test } from "bun:test";

import { composeGeneralV2InvoiceSections } from "./financial-composer";

describe("General V2 invoice composer", () => {
	test("matches the approved repeated-card invoice hierarchy", () => {
		const sections = composeGeneralV2InvoiceSections({
			documentType: "order",
			invoice: {
				subtotalCents: 229_846,
				adjustments: [],
				taxes: [
					{
						key: "tax",
						label: "County & State Tax",
						amountCents: 16_089,
					},
				],
				totalCents: 245_935,
				paidCents: 245_935,
				refundedCents: 0,
				balanceCents: 0,
			},
			paymentGroups: [
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
			pendingCardEstimate: null,
		});

		expect(sections.invoiceLines.map((line) => line.label)).toEqual([
			"Subtotal",
			"County & State Tax",
			"Total",
			"Paid",
			"Card Payment",
		]);
		expect(sections.cardLines).toEqual([
			{
				key: "card-ccc",
				label: "C.C.C.",
				amountCents: 7_378,
				format: "money",
			},
			{
				key: "card-charged",
				label: "Total charged",
				amountCents: 253_313,
				format: "money",
				emphasis: "strong",
			},
			{
				key: "card-count",
				label: "Card payments made",
				amountCents: 2,
				format: "count",
			},
		]);
		expect(sections.payableDueCents).toBe(0);
	});

	test("labels pending card costs as estimates", () => {
		const sections = composeGeneralV2InvoiceSections({
			documentType: "order",
			invoice: {
				subtotalCents: 100_000,
				adjustments: [],
				taxes: [],
				totalCents: 100_000,
				paidCents: 0,
				refundedCents: 0,
				balanceCents: 100_000,
			},
			paymentGroups: [],
			pendingCardEstimate: {
				principalCents: 100_000,
				cccCents: 3_000,
				totalCents: 103_000,
			},
		});

		expect(sections.cardHeading).toBe("Estimated card settlement");
		expect(sections.cardLines.map((line) => line.label)).toEqual([
			"Order due amount",
			"Estimated C.C.C.",
			"Total due with C.C.C.",
		]);
		expect(sections.payableDueCents).toBe(103_000);
	});

	test("keeps recorded card facts distinct from a remaining estimate", () => {
		const sections = composeGeneralV2InvoiceSections({
			documentType: "order",
			invoice: {
				subtotalCents: 100_000,
				adjustments: [],
				taxes: [],
				totalCents: 100_000,
				paidCents: 40_000,
				refundedCents: 0,
				balanceCents: 60_000,
			},
			paymentGroups: [
				{
					method: "card",
					label: "Card",
					paymentCount: 1,
					principalCents: 40_000,
					cccCents: 1_200,
					tipCents: 0,
					customerChargedCents: 41_200,
					cccEvidence: "recorded",
				},
			],
			pendingCardEstimate: {
				principalCents: 60_000,
				cccCents: 1_800,
				totalCents: 61_800,
			},
		});

		expect(sections.cardHeading).toBe("Card settlement");
		expect(sections.cardLines.map((line) => line.label)).toEqual([
			"C.C.C.",
			"Total charged",
			"Remaining order due",
			"Estimated C.C.C.",
			"Total due with C.C.C.",
		]);
		expect(sections.payableDueCents).toBe(61_800);
	});

	test("reconciles gross card receipts with a completed refund", () => {
		const sections = composeGeneralV2InvoiceSections({
			documentType: "order",
			invoice: {
				subtotalCents: 100_000,
				adjustments: [],
				taxes: [],
				totalCents: 100_000,
				paidCents: 50_000,
				refundedCents: 50_000,
				balanceCents: 50_000,
			},
			paymentGroups: [
				{
					method: "card",
					label: "Card",
					paymentCount: 1,
					principalCents: 100_000,
					cccCents: 3_000,
					tipCents: 0,
					customerChargedCents: 103_000,
					cccEvidence: "recorded",
				},
			],
			pendingCardEstimate: null,
		});

		expect(sections.invoiceLines.map((line) => line.label)).toEqual([
			"Subtotal",
			"Total",
			"Card received",
			"Refunded",
			"Net paid",
		]);
		expect(sections.invoiceLines.at(-2)?.amountCents).toBe(-50_000);
		expect(sections.invoiceLines.at(-1)?.amountCents).toBe(50_000);
	});
});
