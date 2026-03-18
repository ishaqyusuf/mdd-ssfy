import type { FooterData, FooterLine } from "../types";
import type { PrintSalesData } from "../query";
import { formatCurrency, sum } from "@gnd/utils";
import { salesTaxByCode, type SalesTaxCode } from "../constants";

export function composeFooter(sale: PrintSalesData): FooterData | null {
  const meta: any = sale.meta;
  const totalPaid = sum(
    sale.payments
      .filter((p) => !p.deletedAt && p.status === "success")
      .map((p) => p.amount),
  );

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

  // C.C.C
  if (meta?.ccc) {
    lines.push({
      label: "C.C.C",
      value: `$${formatCurrency(meta.ccc || 0)}`,
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

  // Total Paid
  if (totalPaid > 0) {
    lines.push({
      label: "Total Paid",
      value: `($${formatCurrency(totalPaid || 0)})`,
      bold: true,
    });
  }

  // Total Due
  lines.push({
    label: "Total Due",
    value: `$${formatCurrency(sale.amountDue || 0)}`,
    bold: true,
    large: true,
  });

  return { lines, notes };
}
