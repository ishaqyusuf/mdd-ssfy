import type { InvoiceSelectableItem } from "../types";

export function getItemSelectorRowSubtitle(item: InvoiceSelectableItem) {
  if (item.source === "workflow") {
    const category = normalizeDisplayValue(item.category);
    return category && !isLikelyUidCopy(category) ? category : "Components";
  }

  return [item.sku, item.category]
    .map(normalizeDisplayValue)
    .filter(Boolean)
    .join(" - ");
}

function normalizeDisplayValue(value: unknown) {
  return String(value || "").trim();
}

function isLikelyUidCopy(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("workflow-")) return true;
  if (normalized.includes("componentuid") || normalized.includes("sourceuid")) {
    return true;
  }
  return /(^|[-_])(uid|uuid)([-_]|$)/.test(normalized);
}
