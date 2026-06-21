import { formatMoney } from "../lib/format";
import type { InvoiceItemSection } from "./items-step-sections";

export function getInvoiceItemsSheetSnapPoints(itemCount: number) {
  const count = Math.max(1, itemCount);
  const estimatedContentHeight = 190 + count * 76;
  const snapPercent = Math.min(92, Math.max(32, estimatedContentHeight / 8.5));
  return [`${Math.round(snapPercent)}%`];
}

export function getInvoiceItemSheetIndexLabel(index: number) {
  return `Item ${String(index + 1).padStart(2, "0")}`;
}

export function getInvoiceItemSheetSummary(section: InvoiceItemSection) {
  const lineCount = section.lines.length;
  const lineLabel = lineCount === 1 ? "line" : "lines";
  const qty = Number(section.qty || 0);
  const qtyLabel = qty > 0 ? `Qty ${qty}` : null;
  return [qtyLabel, `${lineCount} ${lineLabel}`, formatMoney(section.total)]
    .filter(Boolean)
    .join(" • ");
}
