import type { SalesOverviewFinancialBreakdown } from "@gnd/sales/payment-system";

export type GeneralV2FinancialLine = {
	key: string;
	label: string;
	amountCents: number;
	format: "money" | "count";
	emphasis?: "strong";
};

function moneyLine(
	key: string,
	label: string,
	amountCents: number,
	emphasis?: "strong",
): GeneralV2FinancialLine {
	return {
		key,
		label,
		amountCents,
		format: "money",
		...(emphasis ? { emphasis } : {}),
	};
}

export function composeGeneralV2InvoiceSections(
	breakdown: SalesOverviewFinancialBreakdown,
) {
	const { invoice } = breakdown;
	const isQuote = breakdown.documentType === "quote";
	const invoiceLines: GeneralV2FinancialLine[] = [
		moneyLine("invoice-subtotal", "Subtotal", invoice.subtotalCents),
		...invoice.adjustments.map((line) =>
			moneyLine(line.key, line.label, line.amountCents),
		),
		...invoice.taxes.map((line) =>
			moneyLine(line.key, line.label, line.amountCents),
		),
		moneyLine("invoice-total", "Total", invoice.totalCents, "strong"),
	];

	if (!isQuote && invoice.paidCents > 0 && invoice.refundedCents === 0) {
		invoiceLines.push(moneyLine("invoice-paid", "Paid", invoice.paidCents));
	}
	if (!isQuote) {
		for (const group of breakdown.paymentGroups) {
			if (group.principalCents <= 0) continue;
			invoiceLines.push(
				moneyLine(
					`${group.method}-principal`,
					invoice.refundedCents > 0
						? `${group.label} received`
						: `${group.label} Payment`,
					group.principalCents,
				),
			);
		}
		if (invoice.refundedCents > 0) {
			invoiceLines.push(
				moneyLine("invoice-refunded", "Refunded", -invoice.refundedCents),
				moneyLine("invoice-net-paid", "Net paid", invoice.paidCents, "strong"),
			);
		}
	}

	const cardLines: GeneralV2FinancialLine[] = [];
	let cardHeading = "Card settlement";
	const card = breakdown.paymentGroups.find((group) => group.method === "card");

	if (card) {
		if (card.cccCents > 0) {
			cardLines.push(moneyLine("card-ccc", "C.C.C.", card.cccCents));
		}
		if (card.tipCents > 0) {
			cardLines.push(moneyLine("card-tip", "Card tip", card.tipCents));
		}
		if (card.cccCents > 0 || card.tipCents > 0) {
			cardLines.push(
				moneyLine(
					"card-charged",
					"Total charged",
					card.customerChargedCents,
					"strong",
				),
			);
		}
		if (card.paymentCount > 1) {
			cardLines.push({
				key: "card-count",
				label: "Card payments made",
				amountCents: card.paymentCount,
				format: "count",
			});
		}
	}

	if (breakdown.pendingCardEstimate) {
		cardHeading = card ? "Card settlement" : "Estimated card settlement";
		cardLines.push(
			moneyLine(
				"card-estimate-principal",
				card ? "Remaining order due" : "Order due amount",
				breakdown.pendingCardEstimate.principalCents,
			),
		);
		if (breakdown.pendingCardEstimate.cccCents > 0) {
			cardLines.push(
				moneyLine(
					"card-estimate-ccc",
					"Estimated C.C.C.",
					breakdown.pendingCardEstimate.cccCents,
				),
			);
		}
		cardLines.push(
			moneyLine(
				"card-estimate-total",
				"Total due with C.C.C.",
				breakdown.pendingCardEstimate.totalCents,
				"strong",
			),
		);
	}

	return {
		invoiceLines,
		cardLines,
		cardHeading,
		invoiceTotalCents: invoice.totalCents,
		invoicePaidCents: invoice.paidCents,
		invoicePendingCents: invoice.balanceCents,
		payableDueCents:
			breakdown.pendingCardEstimate?.totalCents ?? invoice.balanceCents,
		balanceCents: invoice.balanceCents,
	};
}
