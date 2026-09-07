type Quantity = { qty?: number | null; lh?: number | null; rh?: number | null };

export function assertProductionAssignmentQuantity(requested: Quantity, pending: Quantity) {
  const values = [requested.qty, requested.lh, requested.rh];
  if (values.some(value => value != null && (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)))) {
    throw new Error("Assignment quantities must be non-negative whole numbers.");
  }
  const lh = requested.lh || 0;
  const rh = requested.rh || 0;
  const total = lh + rh || requested.qty || 0;
  if (!lh && !rh && ((pending.lh || 0) > 0 || (pending.rh || 0) > 0)) {
    throw new Error("Select the available left/right production quantities.");
  }
  if (total <= 0 || total > Math.max(0, pending.qty || 0) || lh > Math.max(0, pending.lh || 0) || rh > Math.max(0, pending.rh || 0)) {
    throw new Error("Assignment quantity exceeds the current available production quantity. Refresh and try again.");
  }
  if ((lh || rh) && requested.qty != null && requested.qty !== 0 && requested.qty !== total) {
    throw new Error("Assignment total must match the selected hand quantities.");
  }
}
