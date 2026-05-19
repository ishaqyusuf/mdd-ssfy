export type DealerPrintableSale = Record<string, any> & {
	dealerAuthId?: number | null;
	meta?: unknown;
	subTotal?: number | null;
	tax?: number | null;
	taxPercentage?: number | null;
	grandTotal?: number | null;
	amountDue?: number | null;
	items?: Array<
		Record<string, any> & {
			meta?: unknown;
			rate?: number | null;
			total?: number | null;
		}
	>;
};

export type PrintPricingMode = "customer" | "internal";

function getObject(value: unknown): Record<string, any> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, any>)
		: null;
}

function getDealerPricingSummary(sale: DealerPrintableSale) {
	const meta = getObject(sale.meta);
	const dealerPricing = getObject(meta?.dealerPricing);
	return getObject(dealerPricing?.summary);
}

function getDealerItemPricing(item: NonNullable<DealerPrintableSale["items"]>[number]) {
	const meta = getObject(item.meta);
	return {
		unitPrice:
			meta?.dealerUnitPrice == null ? null : Number(meta.dealerUnitPrice || 0),
		lineTotal:
			meta?.dealerLineTotal == null ? null : Number(meta.dealerLineTotal || 0),
	};
}

export function resolveDealerPrintPricingSurface<TSale extends DealerPrintableSale>(
	sale: TSale,
	pricingMode?: PrintPricingMode | null,
): TSale {
	const isDealerOwned = Number(sale.dealerAuthId || 0) > 0;
	const resolvedMode = pricingMode || (isDealerOwned ? "customer" : "internal");
	if (!isDealerOwned || resolvedMode === "internal") return sale;

	const dealerSummary = getDealerPricingSummary(sale);
	if (!dealerSummary) return sale;

	return {
		...sale,
		subTotal: Number(dealerSummary.subTotal ?? sale.subTotal ?? 0),
		tax: Number(dealerSummary.taxTotal ?? sale.tax ?? 0),
		taxPercentage: Number(dealerSummary.taxRate ?? sale.taxPercentage ?? 0),
		grandTotal: Number(dealerSummary.grandTotal ?? sale.grandTotal ?? 0),
		amountDue: Number(dealerSummary.grandTotal ?? sale.amountDue ?? 0),
		items: (sale.items || []).map((item) => {
			const dealerItemPricing = getDealerItemPricing(item);
			return {
				...item,
				rate: dealerItemPricing.unitPrice ?? item.rate,
				total: dealerItemPricing.lineTotal ?? item.total,
			};
		}),
	} as TSale;
}
