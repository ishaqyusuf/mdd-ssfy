type QtyMatrix = {
  qty?: number | null;
  lh?: number | null;
  rh?: number | null;
  noHandle?: boolean | null;
};

function asNumber(v?: number | null) {
  return Number(v || 0);
}

export function recomposeQty(qty?: QtyMatrix | null) {
  const lh = asNumber(qty?.lh);
  const rh = asNumber(qty?.rh);
  const noHandle = lh <= 0 && rh <= 0;
  return {
    lh,
    rh,
    qty: noHandle ? asNumber(qty?.qty) : lh + rh,
    noHandle,
  };
}

function sumQty(...qties: (QtyMatrix | null | undefined)[]) {
  return qties.reduce(
    (acc, entry) => {
      const q = recomposeQty(entry);
      return {
        qty: acc.qty + q.qty,
        lh: acc.lh + q.lh,
        rh: acc.rh + q.rh,
      };
    },
    { qty: 0, lh: 0, rh: 0 },
  );
}

export function qtyTotal(qty?: QtyMatrix | null) {
  return recomposeQty(qty).qty;
}

export function getPackTargetQty(item: any) {
  const listed = recomposeQty((item?.listedQty || {}) as QtyMatrix);
  const available = recomposeQty((item?.availableQty || {}) as QtyMatrix);
  const packed = recomposeQty((item?.packedQty || {}) as QtyMatrix);
  const deliverable = recomposeQty((item?.deliverableQty || {}) as QtyMatrix);

  const explicitNoHandle =
    (item?.totalQty as any)?.noHandle ??
    (item?.deliverableQty as any)?.noHandle ??
    (item?.availableQty as any)?.noHandle;

  if (explicitNoHandle === true) {
    return {
      qty: Math.max(0, listed.qty > 0 ? listed.qty : available.qty + packed.qty),
      lh: 0,
      rh: 0,
      noHandle: true,
    };
  }

  if (listed.qty > 0) {
    return {
      qty: 0,
      lh: Math.max(0, listed.lh),
      rh: Math.max(0, listed.rh),
      noHandle: false,
    };
  }

  const availablePlusPacked = {
    qty: 0,
    lh: Math.max(0, available.lh + packed.lh),
    rh: Math.max(0, available.rh + packed.rh),
    noHandle: false,
  };
  if (availablePlusPacked.lh > 0 || availablePlusPacked.rh > 0) {
    return availablePlusPacked;
  }

  if (deliverable.qty > 0) {
    if (deliverable.noHandle) {
      return {
        qty: Math.max(0, deliverable.qty),
        lh: 0,
        rh: 0,
        noHandle: true,
      };
    }
    return {
      qty: 0,
      lh: Math.max(0, deliverable.lh),
      rh: Math.max(0, deliverable.rh),
      noHandle: false,
    };
  }

  const deliverables = ((item?.deliverables || []) as { qty?: QtyMatrix }[]).map(
    (entry) => entry?.qty,
  );
  const mergedDeliverables = sumQty(...deliverables);
  if (mergedDeliverables.qty > 0) {
    const hasHandles = mergedDeliverables.lh > 0 || mergedDeliverables.rh > 0;
    return hasHandles
      ? {
          qty: 0,
          lh: mergedDeliverables.lh,
          rh: mergedDeliverables.rh,
          noHandle: false,
        }
      : {
          qty: mergedDeliverables.qty,
          lh: 0,
          rh: 0,
          noHandle: true,
        };
  }

  const total = recomposeQty((item?.totalQty || {}) as QtyMatrix);
  if (total.noHandle) {
    return { qty: total.qty, lh: 0, rh: 0, noHandle: true };
  }
  return { qty: 0, lh: total.lh, rh: total.rh, noHandle: false };
}

export function itemHasSingleQty(item: any) {
  const explicitNoHandle = (item?.totalQty as any)?.noHandle;
  if (typeof explicitNoHandle === "boolean") return explicitNoHandle;
  return !!getPackTargetQty(item).noHandle;
}
