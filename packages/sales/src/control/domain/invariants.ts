import type { QtyStat } from "./types";

export class ControlInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ControlInvariantError";
  }
}

export function assertNonNegativeQty(label: string, qty: QtyStat) {
  if (qty.lhQty < 0 || qty.rhQty < 0 || qty.qty < 0 || qty.total < 0) {
    throw new ControlInvariantError(`${label} must not be negative`);
  }
}

export function assertPackedNotGreaterThanAvailable(
  packed: QtyStat,
  available: QtyStat,
) {
  if (
    packed.total > available.total ||
    packed.qty > available.qty ||
    packed.lhQty > available.lhQty ||
    packed.rhQty > available.rhQty
  ) {
    throw new ControlInvariantError("Packed quantity exceeds available quantity");
  }
}

