import type { FooterData, FooterLine, PrintMode } from "../types";
import type { PrintSalesData } from "../query";
import { formatCurrency } from "@gnd/utils";
import { salesTaxByCode, type SalesTaxCode } from "../constants";
import { getPrintPaymentFooterState } from "./payment-footer-state";

export function composeFooter(
  sale: PrintSalesData,
  mode?: PrintMode,
): FooterData | null {
  const hideBalanceDue = mode === "production" || mode === "packing-slip";
  const meta: any = sale.meta;
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
          label: "C.C.C",
          value: `$${formatCurrency(paymentState.estimatedDueCharge.cccAmount)}`,
          bold: true,
        });
      }
      if (!hideBalanceDue) {
        lines.push({
          label: "Total Due With C.C.C",
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
      const charge = paymentState.recordedCardCharges[0];
      if (charge?.cccAmount) {
        lines.push({
          label: "C.C.C",
          value: `$${formatCurrency(charge.cccAmount)}`,
          bold: true,
        });
        lines.push({
          label: "Paid",
          value: `($${formatCurrency(charge.customerChargedAmount)})`,
          bold: true,
        });
      } else {
        lines.push({
          label: "Paid",
          value: `($${formatCurrency(paymentState.principalPaid)})`,
          bold: true,
        });
      }
      if (!hideBalanceDue) {
        lines.push({
          label: "Total Due",
          value: "$0.00",
          bold: true,
          large: true,
        });
      }
      break;
    }
    case "paid-single-full-non-card": {
      lines.push({
        label: "Paid",
        value: `($${formatCurrency(paymentState.principalPaid)})`,
        bold: true,
      });
      if (!hideBalanceDue) {
        lines.push({
          label: "Total Due",
          value: "$0.00",
          bold: true,
          large: true,
        });
      }
      break;
    }
    case "partial-or-mixed": {
      lines.push({
        label: "Order Total",
        value: `$${formatCurrency(paymentState.orderTotal)}`,
        bold: true,
      });
      if (paymentState.principalPaid > 0) {
        lines.push({
          label: "Paid Toward Order",
          value: `($${formatCurrency(paymentState.principalPaid)})`,
          bold: true,
        });
      }
      for (const charge of paymentState.recordedCardCharges) {
        lines.push({
          label: "Card Payment",
          value: `$${formatCurrency(charge.principalAmount)}`,
        });
        lines.push({
          label: "C.C.C on Card Payment",
          value: `$${formatCurrency(charge.cccAmount)}`,
        });
        lines.push({
          label: "Charged to Card",
          value: `$${formatCurrency(charge.customerChargedAmount)}`,
          bold: true,
        });
      }
      if (!hideBalanceDue) {
        lines.push({
          label: "Balance Due",
          value: `$${formatCurrency(paymentState.amountDue)}`,
          bold: true,
          large: true,
        });
      }
      break;
    }
    case "unpaid-no-card":
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
