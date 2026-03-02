import { DispatchDeliverable, QtyMatrix } from "../types/dispatch.types";

export type PackingSubmission = {
  submissionId: number;
  qty: QtyMatrix;
};

export type BuildPackingPayloadInput = {
  salesItemId: number;
  note?: string;
  enteredQty: QtyMatrix;
  deliverables: DispatchDeliverable[];
};

export type BuildPackingPayloadResult = {
  packingList: {
    salesItemId: number;
    note?: string;
    submissions: PackingSubmission[];
  }[];
  remainder: QtyMatrix;
};

function asNumber(value: number | null | undefined) {
  return Number(value || 0);
}

export function hasQty(qty?: QtyMatrix | null) {
  if (!qty) return false;
  return asNumber(qty.qty) > 0 || asNumber(qty.lh) > 0 || asNumber(qty.rh) > 0;
}

function subtractQty(source: QtyMatrix, picked: QtyMatrix): QtyMatrix {
  return {
    qty: Math.max(0, asNumber(source.qty) - asNumber(picked.qty)),
    lh: Math.max(0, asNumber(source.lh) - asNumber(picked.lh)),
    rh: Math.max(0, asNumber(source.rh) - asNumber(picked.rh)),
  };
}

function pickQtyFrom(source: QtyMatrix, available: QtyMatrix) {
  const sourceQty = asNumber(source.qty);
  const sourceLh = asNumber(source.lh);
  const sourceRh = asNumber(source.rh);
  const availableQty = asNumber(available.qty);
  const availableLh = asNumber(available.lh);
  const availableRh = asNumber(available.rh);

  const useSingleQty = sourceQty > 0 || availableQty > 0;
  const picked: QtyMatrix = useSingleQty
    ? {
        qty: Math.min(sourceQty, availableQty),
      }
    : {
        lh: Math.min(sourceLh, availableLh),
        rh: Math.min(sourceRh, availableRh),
      };

  const pendingPick = subtractQty(source, picked);
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

  const submissions: PackingSubmission[] = [];

  for (const deliverable of input.deliverables) {
    if (!hasQty(remaining)) break;
    const { picked, pendingPick } = pickQtyFrom(remaining, deliverable.qty);
    if (hasQty(picked)) {
      submissions.push({
        submissionId: deliverable.submissionId,
        qty: picked,
      });
      remaining = {
        qty: asNumber(pendingPick.qty),
        lh: asNumber(pendingPick.lh),
        rh: asNumber(pendingPick.rh),
      };
    }
  }

  return {
    packingList: [
      {
        salesItemId: input.salesItemId,
        note: input.note,
        submissions,
      },
    ],
    remainder: remaining,
  };
}
