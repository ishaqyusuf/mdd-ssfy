import type { PrintMode } from "./types";

export const SALES_PRICE_DISPLAYS = ["detailed", "totals-only"] as const;

export type SalesPriceDisplay = (typeof SALES_PRICE_DISPLAYS)[number];

export const TOTALS_ONLY_SALES_TEMPLATE_ID = "template-2";

export function normalizeSalesPriceDisplay(
	value?: string | null,
): SalesPriceDisplay {
	return value === "totals-only" ? "totals-only" : "detailed";
}

export function resolveSalesPriceDisplayTemplateId(
	priceDisplay: SalesPriceDisplay,
	templateId?: string | null,
) {
	return priceDisplay === "totals-only"
		? TOTALS_ONLY_SALES_TEMPLATE_ID
		: templateId;
}

export function assertSalesPriceDisplaySupported(
	mode: PrintMode,
	priceDisplay: SalesPriceDisplay,
) {
	if (
		priceDisplay === "totals-only" &&
		mode !== "invoice" &&
		mode !== "quote"
	) {
		throw new Error(
			"Totals-only pricing is supported only for invoices and quotes.",
		);
	}
}
