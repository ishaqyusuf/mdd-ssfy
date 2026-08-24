export type DispatchQuantity = {
  qty?: number | null;
  lh?: number | null;
  rh?: number | null;
};

type NormalizedQuantity = {
  qty: number;
  lh: number;
  rh: number;
  total: number;
};

export type LegacyDispatchManifestItemInput = {
  title?: string | null;
  sectionTitle?: string | null;
  size?: string | null;
  swing?: string | null;
  doorId?: number | null;
  orderedQty?: DispatchQuantity | null;
  packedQty?: DispatchQuantity | null;
};

function quantity(
  value: DispatchQuantity | null | undefined,
): NormalizedQuantity {
  const lh = Number(value?.lh || 0);
  const rh = Number(value?.rh || 0);
  // Legacy dispatch rows store the handled total in `qty` as well as its
  // LH/RH breakdown. Treat the breakdown as authoritative so a 1 LH row is
  // never presented as two packed units.
  const qty = lh > 0 || rh > 0 ? 0 : Number(value?.qty || 0);
  return { qty, lh, rh, total: qty + lh + rh };
}
function remaining(ordered: NormalizedQuantity, packed: NormalizedQuantity) {
  const qty = Math.max(0, ordered.qty - packed.qty);
  const lh = Math.max(0, ordered.lh - packed.lh);
  const rh = Math.max(0, ordered.rh - packed.rh);
  return { qty, lh, rh, total: qty + lh + rh };
}

function handingFromQuantity(ordered: NormalizedQuantity) {
  return [
    ordered.lh > 0 ? `LH × ${ordered.lh}` : null,
    ordered.rh > 0 ? `RH × ${ordered.rh}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function hasSwingConflict(swing: string, ordered: NormalizedQuantity) {
  const normalized = swing.trim().toLowerCase();
  const saysLeft = /(^|\b)(lh|left)(\b|$)/.test(normalized);
  const saysRight = /(^|\b)(rh|right)(\b|$)/.test(normalized);
  return (
    (saysLeft && !saysRight && ordered.rh > 0 && ordered.lh === 0) ||
    (saysRight && !saysLeft && ordered.lh > 0 && ordered.rh === 0)
  );
}

export function normalizeLegacyDispatchManifestItem(
  input: LegacyDispatchManifestItemInput,
) {
  const orderedQty = quantity(input.orderedQty);
  const packedQty = quantity(input.packedQty);
  const savedSwing = input.swing?.trim() || null;
  const quantityHanding = handingFromQuantity(orderedQty);
  const requiresHanding = Boolean(input.doorId);
  const missingFields: string[] = [];
  const warnings: string[] = [];

  if (requiresHanding && !input.size?.trim()) missingFields.push("size");
  if (requiresHanding && !savedSwing && !quantityHanding) {
    missingFields.push("handing");
  }
  if (
    savedSwing &&
    quantityHanding &&
    hasSwingConflict(savedSwing, orderedQty)
  ) {
    warnings.push("Saved swing conflicts with the ordered LH/RH quantity.");
  }

  return {
    itemType: input.sectionTitle?.trim() || "Item",
    productTitle: input.title?.trim() || "Untitled item",
    size: input.size?.trim() || null,
    swing: savedSwing,
    handingLabel:
      quantityHanding ||
      savedSwing ||
      (requiresHanding ? "Handing not recorded" : "Not applicable"),
    orderedQty,
    packedQty,
    remainingQty: remaining(orderedQty, packedQty),
    detailCompleteness: warnings.length
      ? ("review_required" as const)
      : missingFields.length
        ? ("incomplete" as const)
        : ("complete" as const),
    missingFields,
    warnings,
  };
}
