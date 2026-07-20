import type {
  NewSalesFormExtraCost,
  NewSalesFormLineItem,
  NewSalesFormSummary,
} from "../types";
import { computeNormalizedSalesFormSummary } from "@gnd/sales/sales-form-core";

export function calculateInvoiceSummary(input: {
  lineItems: NewSalesFormLineItem[];
  extraCosts: NewSalesFormExtraCost[];
  taxRate: number;
  paymentMethod?: string | null;
  cccPercentage?: number | null;
}): NewSalesFormSummary {
  const summary = computeNormalizedSalesFormSummary(
    input.lineItems,
    input.taxRate,
    input.extraCosts,
    input.paymentMethod,
    input.cccPercentage,
  ) as NewSalesFormSummary;

  return {
    subTotal: summary.subTotal,
    adjustedSubTotal: summary.adjustedSubTotal,
    taxRate: summary.taxRate,
    taxTotal: summary.taxTotal,
    grandTotal: summary.grandTotal,
    totalWithCcc: summary.totalWithCcc,
    discount: summary.discount,
    discountPct: summary.discountPct,
    percentDiscountValue: summary.percentDiscountValue,
    labor: summary.labor,
    delivery: summary.delivery,
    otherCosts: summary.otherCosts,
    taxableSubTotal: summary.taxableSubTotal,
    ccc: summary.ccc,
  };
}
