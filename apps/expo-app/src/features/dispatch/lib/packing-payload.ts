import { DispatchDeliverable, QtyMatrix } from "../types/dispatch.types";

export type PackingLine = {
  salesItemId: number;
  submissionId: number;
  qty: QtyMatrix;
  note?: string;
};

export type BuildPackingPayloadInput = {
  salesItemId: number;
  note?: string;
  enteredQty: QtyMatrix;
  deliverables: DispatchDeliverable[];
};

export type BuildPackingPayloadResult = {
  packingLines: PackingLine[];
  remainder: QtyMatrix;
};

function asNumber(value: number | null | undefined) {
  return Number(value || 0);
}

function recomposeQty(qty?: QtyMatrix | null): QtyMatrix & { noHandle: boolean } {
  const lh = asNumber(qty?.lh);
  const rh = asNumber(qty?.rh);
  const noHandle = lh <= 0 && rh <= 0;
  const summed = lh + rh;
  return {
    lh,
    rh,
    qty: noHandle ? asNumber(qty?.qty) : summed,
    noHandle,
  };
}

export function hasQty(qty?: QtyMatrix | null) {
  if (!qty) return false;
  return asNumber(qty.qty) > 0 || asNumber(qty.lh) > 0 || asNumber(qty.rh) > 0;
}

function pickQtyFrom(source: QtyMatrix, available: QtyMatrix) {
  const requested = recomposeQty(source);
  const basket = recomposeQty(available);

  const picked: QtyMatrix = { lh: 0, rh: 0, qty: 0 };
  let remainingPick = asNumber(requested.qty);

  if (asNumber(basket.rh) > 0 && remainingPick > 0) {
    const take = Math.min(asNumber(basket.rh), remainingPick);
    picked.rh = take;
    remainingPick -= take;
  }

  if (asNumber(basket.lh) > 0 && remainingPick > 0) {
    const take = Math.min(asNumber(basket.lh), remainingPick);
    picked.lh = take;
    remainingPick -= take;
  }

  if (basket.noHandle && asNumber(basket.qty) > 0 && remainingPick > 0) {
    const take = Math.min(asNumber(basket.qty), remainingPick);
    picked.qty = take;
    remainingPick -= take;
  }

  const handledPicked = asNumber(picked.lh) + asNumber(picked.rh);
  if (handledPicked > 0 && asNumber(picked.qty) <= 0) {
    picked.qty = handledPicked;
  }

  const pendingPick: QtyMatrix =
    remainingPick > 0
      ? { qty: remainingPick, lh: 0, rh: 0 }
      : { qty: 0, lh: 0, rh: 0 };

  return { picked, pendingPick };
}

export function buildPackingPayload(
  input: BuildPackingPayloadInput,
): BuildPackingPayloadResult {
  let remaining: QtyMatrix = {
    qty: asNumber(input.enteredQty.qty),
    lh: asNumber(input.enteredQty.lh),
    rh: asNumber(input.enteredQty.rh),
  };

  const packingLines: PackingLine[] = [];

  for (const deliverable of input.deliverables) {
    if (!hasQty(remaining)) break;
    const { picked, pendingPick } = pickQtyFrom(remaining, deliverable.qty);
    if (hasQty(picked)) {
      packingLines.push({
        salesItemId: input.salesItemId,
        submissionId: deliverable.submissionId,
        qty: picked,
        note: input.note,
      });
      remaining = {
        qty: asNumber(pendingPick.qty),
        lh: asNumber(pendingPick.lh),
        rh: asNumber(pendingPick.rh),
      };
    }
  }

  return {
    packingLines,
    remainder: remaining,
  };
}
