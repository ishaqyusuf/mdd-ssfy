import type {
	SalesPaymentSummary,
	SalesPaymentSummaryGroup,
} from "./payment-summary";

export type SalesOverviewFinancialLine = {
	key: string;
	label: string;
	amountCents: number;
};

export type SalesOverviewPendingCardEstimate = {
	principalCents: number;
	cccCents: number;
	totalCents: number;
};

export type SalesOverviewFinancialBreakdown = {
	documentType: "order" | "quote";
	invoice: {
		subtotalCents: number;
		adjustments: SalesOverviewFinancialLine[];
		taxes: SalesOverviewFinancialLine[];
		totalCents: number;
		paidCents: number;
		refundedCents: number;
		balanceCents: number;
	};
	paymentGroups: SalesPaymentSummaryGroup[];
	pendingCardEstimate: SalesOverviewPendingCardEstimate | null;
};

export type ComposeSalesOverviewFinancialBreakdownInput = {
	documentType: "order" | "quote";
	subtotalCents: number;
	adjustments: SalesOverviewFinancialLine[];
	taxes: SalesOverviewFinancialLine[];
	totalCents: number;
	paidCents: number;
	refundedCents?: number;
	balanceCents: number;
	paymentSummary?: SalesPaymentSummary | null;
	pendingCardEstimate?: SalesOverviewPendingCardEstimate | null;
};

function cents(value: number) {
	return Number.isFinite(value) ? Math.round(value) : 0;
}

function nonNegativeCents(value: number) {
	return Math.max(0, cents(value));
}

function financialLines(lines: SalesOverviewFinancialLine[]) {
	return lines.flatMap((line) => {
		const label = line.label.trim();
		const amountCents = cents(line.amountCents);
		if (!label || amountCents === 0) return [];
		return [{ ...line, label, amountCents }];
	});
}

export function moneyToCents(value?: number | string | null) {
	const numeric = Number(value || 0);
	return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

export function composeSalesOverviewFinancialBreakdown(
	input: ComposeSalesOverviewFinancialBreakdownInput,
): SalesOverviewFinancialBreakdown {
	const isQuote = input.documentType === "quote";
	const paymentGroups = isQuote
		? []
		: (input.paymentSummary?.groups ?? []).map((group) => ({ ...group }));
	const pendingCardEstimate =
		!isQuote && input.pendingCardEstimate
			? {
					principalCents: nonNegativeCents(
						input.pendingCardEstimate.principalCents,
					),
					cccCents: nonNegativeCents(input.pendingCardEstimate.cccCents),
					totalCents: nonNegativeCents(input.pendingCardEstimate.totalCents),
				}
			: null;

	return {
		documentType: input.documentType,
		invoice: {
			subtotalCents: cents(input.subtotalCents),
			adjustments: financialLines(input.adjustments),
			taxes: financialLines(input.taxes),
			totalCents: nonNegativeCents(input.totalCents),
			paidCents: isQuote ? 0 : nonNegativeCents(input.paidCents),
			refundedCents: isQuote ? 0 : nonNegativeCents(input.refundedCents ?? 0),
			balanceCents: isQuote
				? nonNegativeCents(input.totalCents)
				: nonNegativeCents(input.balanceCents),
		},
		paymentGroups,
		pendingCardEstimate,
	};
}
