import type { FulfillmentQuantity } from "./fulfillment-quantities";

type AvailableQuantity = { qty?: number | null; lh?: number | null; rh?: number | null };

/** Remaining production demand, expressed in the existing production matrix convention. */
export function fulfillmentProductionLimits(input: {
  planned: Array<{ uid: string; quantity: FulfillmentQuantity }>;
  packed: Array<{ uid: string; packed: FulfillmentQuantity }>;
  items: Array<{ controlUid: string; deliverables?: Array<{ qty?: AvailableQuantity | null }> | null }>;
}) {
  const items = new Map(input.items.map(item => [item.controlUid, item]));
  const packed = new Map(input.packed.map(item => [item.uid, item.packed]));
  return input.planned.map(line => {
    const item = items.get(line.uid);
    if (!item) throw new Error("Assigned item is missing from production information.");
    const used = packed.get(line.uid);
    const available = { qty: 0, lh: 0, rh: 0 };
    for (const row of item.deliverables ?? []) {
      for (const axis of ["qty", "lh", "rh"] as const) {
        const value = row.qty?.[axis] ?? 0;
        if (!Number.isFinite(value) || value < 0)
          throw new Error("Review deliverable quantities before production preparation.");
        available[axis] += value;
      }
    }
    const lh = Math.max(0, line.quantity.lh - (used?.lh ?? 0) - available.lh);
    const rh = Math.max(0, line.quantity.rh - (used?.rh ?? 0) - available.rh);
    const qty = line.quantity.lh + line.quantity.rh > 0
      ? lh + rh
      : Math.max(0, line.quantity.qty - (used?.qty ?? 0) - available.qty);
    return { uid: line.uid, quantity: { qty, lh, rh } };
  });
}
