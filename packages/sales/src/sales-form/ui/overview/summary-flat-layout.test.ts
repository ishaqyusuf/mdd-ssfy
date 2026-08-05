import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const detailsSource = readFileSync(
	new URL("./invoice-details-panel.tsx", import.meta.url),
	"utf8",
);
const pricingSource = readFileSync(
	new URL("./invoice-pricing-overview.tsx", import.meta.url),
	"utf8",
);

describe("sales summary flat layout", () => {
	it("uses shared section rhythm and removes nested summary cards", () => {
		expect(detailsSource).toContain("border-b border-border/70 pb-6");
		expect(pricingSource).toContain("border-b border-border/70 pb-6");
		expect(pricingSource).toContain("divide-y divide-border/70");
		expect(detailsSource).not.toContain("rounded-xl border border-border");
		expect(pricingSource).not.toContain("rounded-xl border border-primary/20");
		expect(pricingSource).not.toContain("rounded-lg border bg-muted/30 p-4");
	});

	it("keeps each summary section self-explanatory", () => {
		expect(detailsSource).toContain(
			"Payment terms, due dates, and fulfillment.",
		);
		expect(pricingSource).toContain(
			"Invoice-wide charges, tax, and payment settings.",
		);
		expect(pricingSource).toContain(
			"Select a cost type, then edit its label and amount.",
		);
		expect(pricingSource).toContain("No additional costs added.");
	});

	it("matches the legacy order and quote payment-date controls", () => {
		expect(detailsSource).toContain("hasAutomaticOrderDueDate");
		expect(detailsSource).toContain("disabled={hasAutomaticOrderDueDate}");
		expect(detailsSource).toContain("{isQuote ? null : (");
		expect(detailsSource).toContain('label={isQuote ? "Good Until" : "Due"}');
	});

	it("hides the P.O. and invoice date controls", () => {
		expect(detailsSource).not.toContain('id="invoice-po"');
		expect(detailsSource).not.toContain('id="invoice-order-date"');
	});
});
