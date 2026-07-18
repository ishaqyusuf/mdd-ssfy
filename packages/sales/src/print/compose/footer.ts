import { formatCurrency } from "@gnd/utils";
import { type SalesTaxCode, salesTaxByCode } from "../constants";
import type { PrintSalesData } from "../query";
import type { FooterData, FooterLine, PrintMode } from "../types";
import {
  getPrintPaymentFooterState,
  getPrintPaymentFooterSummary,
} from "./payment-footer-state";

function appendPaidSummary(
  lines: FooterLine[],
  paymentState: ReturnType<typeof getPrintPaymentFooterState>,
  hideBalanceDue: boolean,
) {
  const { cardFees, totalPaid } =
    getPrintPaymentFooterSummary(paymentState);

  lines.push({
    label: "Order Total",
    value: `$${formatCurrency(paymentState.orderTotal)}`,
    bold: true,
  });
  if (cardFees > 0) {
    lines.push({
      label: "Card Fees",
      value: `$${formatCurrency(cardFees)}`,
    });
  }
  lines.push({
    label: "Total Paid",
    value: `$${formatCurrency(totalPaid)}`,
    bold: true,
  });
  if (!hideBalanceDue) {
    lines.push({
      label: "Balance Due",
      value: `$${formatCurrency(paymentState.amountDue)}`,
      bold: true,
      large: true,
    });
  }
}

export function composeFooter(
  sale: PrintSalesData,
  mode?: PrintMode,
): FooterData | null {
  const hideBalanceDue = mode === "production" || mode === "packing-slip";
  const meta = sale.meta as {
    deliveryCost?: number | null;
    labor_cost?: number | null;
  } | null;
  const paymentState = getPrintPaymentFooterState(sale);

  const lines: FooterLine[] = [];
  const notes: string[] = [];

  // Subtotal
  lines.push({
    label: "Subtotal",
    value: `$${formatCurrency(sale.subTotal || 0)}`,
    bold: true,
  });

  // Taxes
  if (sale.taxes?.length) {
    for (const t of sale.taxes.filter((s) => !s.deletedAt).slice(0, 1)) {
      const sData = salesTaxByCode[t.taxCode as SalesTaxCode];
      if (sData) {
        lines.push({
          label: `${sData.title} ${sData.percentage}%`,
          value: `$${formatCurrency(t.tax)}`,
          bold: true,
        });
      } else {
        const label = t.taxConfig
          ? `${t.taxConfig.title} ${t.taxConfig.percentage}%`
          : "Tax";
        lines.push({
          label,
          value: `$${formatCurrency(t.tax)}`,
          bold: true,
        });
      }
    }
  } else if (sale.tax) {
    lines.push({
      label: `Tax (${sale.taxPercentage}%)`,
      value: `$${formatCurrency(sale.tax || 0)}`,
      bold: true,
    });
  }

  // Labor
  if (meta?.labor_cost) {
    lines.push({
      label: "Labor",
      value: `$${formatCurrency(meta.labor_cost || 0)}`,
      bold: true,
    });
  }

  // Extra costs
  for (const ec of sale.extraCosts ?? []) {
    lines.push({
      label: ec.label ?? "Extra",
      value: `$${formatCurrency(ec.amount || 0)}`,
      bold: true,
    });
  }

  // Delivery
  if (meta?.deliveryCost > 0) {
    lines.push({
      label: "Delivery",
      value: `$${formatCurrency(meta.deliveryCost)}`,
    });
  }

  switch (paymentState.kind) {
    case "unpaid-card-estimate": {
      lines.push({
        label: "Order Due Amount",
        value: `$${formatCurrency(paymentState.amountDue)}`,
        bold: true,
      });
      if (paymentState.estimatedDueCharge?.cccAmount) {
        lines.push({
          label: "Estimated Card Fee",
          value: `$${formatCurrency(paymentState.estimatedDueCharge.cccAmount)}`,
          bold: true,
        });
      }
      if (!hideBalanceDue) {
        lines.push({
          label: "Total if Paying by Card",
          value: `$${formatCurrency(
            paymentState.estimatedDueCharge?.customerChargedAmount ||
              paymentState.amountDue,
          )}`,
          bold: true,
          large: true,
        });
      }
      break;
    }
    case "paid-single-full-card": {
      appendPaidSummary(lines, paymentState, hideBalanceDue);
      break;
    }
    case "paid-single-full-non-card": {
      appendPaidSummary(lines, paymentState, hideBalanceDue);
      break;
    }
    case "partial-or-mixed": {
      appendPaidSummary(lines, paymentState, hideBalanceDue);
      break;
    }
    default: {
      if (!hideBalanceDue) {
        lines.push({
          label: "Total Due",
          value: `$${formatCurrency(paymentState.amountDue)}`,
          bold: true,
          large: true,
        });
      }
      break;
    }
  }

  return { lines, notes };
}
