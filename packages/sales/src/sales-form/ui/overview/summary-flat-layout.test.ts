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
			"Purchase order, payment terms, and fulfillment.",
		);
		expect(detailsSource).toContain(
			"Production and fulfillment target dates for this order.",
		);
		expect(pricingSource).toContain(
			"Invoice-wide charges, tax, and payment settings.",
		);
		expect(pricingSource).toContain(
			"Select a cost type, then edit its label and amount.",
		);
		expect(pricingSource).toContain("No additional costs added.");
	});

	it("keeps quote validity and groups order planning dates separately", () => {
		expect(detailsSource).toContain("hasAutomaticOrderDueDate");
		expect(detailsSource).toContain("disabled={hasAutomaticOrderDueDate}");
		expect(detailsSource).toContain('title="Due Dates"');
		expect(detailsSource).toContain('label="Production"');
		expect(detailsSource).toContain('label="Fulfillment"');
		expect(detailsSource).toContain('label="Good Until"');
		expect(detailsSource).not.toContain('label="Delivery Due Date"');
		expect(detailsSource).not.toContain("props.onDeliveryDueDateChange");
		expect(detailsSource).toContain("highlightToday");
	});

	it("uses the shared shadcn select for fulfillment", () => {
		expect(detailsSource).toContain('from "@gnd/ui/select"');
		expect(detailsSource).toContain("<SelectGroup>");
		expect(detailsSource).toContain("<SelectItem");
		expect(detailsSource).not.toContain(
			'<select\n\t\t\t\t\t\tid="invoice-fulfillment"',
		);
	});

	it("shows an accessible P.O. control and keeps invoice date hidden", () => {
		expect(detailsSource).toContain('htmlFor="invoice-po"');
		expect(detailsSource).toContain('id="invoice-po"');
		expect(detailsSource).toContain("P.O. Number");
		expect(detailsSource).toContain("props.onPoChange?.(event.target.value)");
		expect(detailsSource).not.toContain('id="invoice-order-date"');
	});
});
