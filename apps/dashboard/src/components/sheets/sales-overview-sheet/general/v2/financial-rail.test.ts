import { afterAll, expect, mock, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { composeGeneralV2InvoiceSections } from "./financial-composer";

mock.module("@/components/sales-overview-payment-method-select", () => ({
	SalesOverviewPaymentMethodSelect: ({ disabled }: { disabled: boolean }) =>
		createElement("button", { disabled }, "Payment method"),
}));
const { FinancialRail } = await import("./financial-rail");
afterAll(() => mock.restore());

function render(
	input: {
		paid?: number;
		refunded?: number;
		fee?: number;
		quote?: boolean;
	} = {},
) {
	const paid = input.paid ?? 4000;
	const balance = 10000 - paid;
	const sections = composeGeneralV2InvoiceSections({
		documentType: input.quote ? "quote" : "order",
		invoice: {
			subtotalCents: 10000,
			adjustments: [],
			taxes: [],
			totalCents: 10000,
			paidCents: paid,
			refundedCents: input.refunded ?? 0,
			balanceCents: balance,
		},
		paymentGroups: [],
		pendingCardEstimate: input.fee
			? {
					principalCents: balance,
					cccCents: input.fee,
					totalCents: balance + input.fee,
				}
			: null,
	});
	return renderToStaticMarkup(
		createElement(FinancialRail, {
			...sections,
			data: { id: 1 },
			isQuote: !!input.quote,
			paymentPercentage: paid / 100,
			paymentStatus: balance > 0 ? "Payment due" : "Settled",
			paymentMethod: "Cash",
			onCreatePayment: () => {},
		}),
	);
}

test("shows primary amounts once and keeps breakdown collapsed", () => {
	const html = render();
	expect(html.match(/<dt[^>]*>Total<\/dt>/g)).toHaveLength(1);
	expect(html.match(/<dt[^>]*>Paid<\/dt>/g)).toHaveLength(1);
	expect(html).toContain("Balance due");
	expect(html).toContain("$60.00");
	expect(html).toContain("<details");
	expect(html).not.toMatch(/<details[^>]*\bopen/);
	expect(html).not.toContain("percent settled");
	expect(html).toContain(">Pay</button>");
});

test("fee-inclusive payable amount remains visible outside the breakdown", () => {
	const primary = render({ fee: 180 }).split("<details")[0]!;
	expect(primary).toContain("Due with card fee");
	expect(primary).toContain("$61.80");
	expect(primary).toContain("$60.00");
});

test("refund detail is retained and overpayment is a credit", () => {
	expect(render({ refunded: 2000 })).toContain("Refunded");
	const credit = render({ paid: 12000 });
	expect(credit).toContain("Credit balance");
	expect(credit).toContain("$20.00");
	expect(credit).not.toContain(">Pay</button>");
});

test("settled orders cannot collect another payment and quotes show total only", () => {
	expect(render({ paid: 10000 })).not.toContain(">Pay</button>");
	const quote = render({ quote: true });
	expect(quote).toContain("$100.00");
	expect(quote).not.toContain("Balance due");
	expect(quote).not.toContain(">Paid<");
	expect(quote).not.toContain(">Pay</button>");
});
