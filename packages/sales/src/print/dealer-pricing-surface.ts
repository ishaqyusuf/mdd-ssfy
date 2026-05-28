import { calculateSalesFormSummary } from "../sales-form/domain";

export type DealerPrintableSale = Record<string, any> & {
  dealerAuthId?: number | null;
  meta?: unknown;
  subTotal?: number | null;
  tax?: number | null;
  taxPercentage?: number | null;
  grandTotal?: number | null;
  amountDue?: number | null;
  dealerSale?: {
    dealerSalesPercentage?: number | null;
    grandTotal?: number | null;
    dueAmount?: number | null;
  } | null;
  extraCosts?: Array<Record<string, any>>;
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

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getDealerSalesPercentage(sale: DealerPrintableSale) {
  const value = Number(sale.dealerSale?.dealerSalesPercentage ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getPaymentMethod(sale: DealerPrintableSale) {
  const meta = getObject(sale.meta);
  return typeof meta?.payment_option === "string" ? meta.payment_option : null;
}

function getCccPercentage(sale: DealerPrintableSale) {
  const meta = getObject(sale.meta);
  const value = Number(meta?.ccc_percentage ?? 3.5);
  return Number.isFinite(value) ? value : 3.5;
}

export function resolveDealerPrintPricingSurface<
  TSale extends DealerPrintableSale,
>(sale: TSale, pricingMode?: PrintPricingMode | null): TSale {
  const isDealerOwned = Number(sale.dealerAuthId || 0) > 0;
  const resolvedMode = pricingMode || (isDealerOwned ? "customer" : "internal");
  if (!isDealerOwned || resolvedMode === "internal") return sale;

  const dealerMultiplier = 1 + getDealerSalesPercentage(sale) / 100;
  const items = (sale.items || []).map((item) => {
    const qty = Number(item.qty || 0);
    const rate = roundCurrency(Number(item.rate || 0) * dealerMultiplier);
    const total = roundCurrency(qty * rate);

    return {
      ...item,
      rate,
      total,
    };
  });
  const summary = calculateSalesFormSummary({
    strategy: "legacy",
		taxRate: sale.taxPercentage,
		lineItems: items.map((item) => ({
			...item,
			unitPrice: item.rate,
			lineTotal: item.total,
			meta: getObject(item.meta) ?? {},
		})),
		extraCosts: (sale.extraCosts || []).map((cost) => ({
			...cost,
			type: String(cost.type || "CustomNonTaxxable"),
		})),
		paymentMethod: getPaymentMethod(sale),
		cccPercentage: getCccPercentage(sale),
	});

  return {
    ...sale,
    subTotal: summary.subTotal,
    tax: summary.taxTotal,
    taxPercentage: summary.taxRate,
    grandTotal: summary.grandTotal,
    amountDue: Number(sale.dealerSale?.dueAmount ?? summary.grandTotal),
    items,
  } as TSale;
}
