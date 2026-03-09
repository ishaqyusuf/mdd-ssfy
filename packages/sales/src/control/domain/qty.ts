import type { QtyStat } from "./types";

function toNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

export function toQtyStat(input?: Partial<QtyStat> | null): QtyStat {
  const lhQty = Math.max(toNumber(input?.lhQty), 0);
  const rhQty = Math.max(toNumber(input?.rhQty), 0);
  const qty = Math.max(toNumber(input?.qty), 0);
  const total =
    input?.total === undefined || input?.total === null
      ? lhQty + rhQty || qty
      : Math.max(toNumber(input.total), 0);
  return { lhQty, rhQty, qty, total };
}

export function emptyQtyStat(): QtyStat {
  return toQtyStat();
}

export function sumQtyStat(...stats: (QtyStat | null | undefined)[]): QtyStat {
  const filtered = stats.filter(Boolean) as QtyStat[];
  const total = filtered.reduce(
    (acc, stat) => ({
      lhQty: toNumber(acc.lhQty) + toNumber(stat.lhQty),
      rhQty: toNumber(acc.rhQty) + toNumber(stat.rhQty),
      qty: toNumber(acc.qty) + toNumber(stat.qty),
      total: toNumber(acc.total) + toNumber(stat.total),
    }),
    { lhQty: 0, rhQty: 0, qty: 0, total: 0 },
  );
  return toQtyStat(total);
}

export function diffQtyStat(base: QtyStat, subtract: QtyStat): QtyStat {
  return toQtyStat({
    lhQty: Math.max(toNumber(base.lhQty) - toNumber(subtract.lhQty), 0),
    rhQty: Math.max(toNumber(base.rhQty) - toNumber(subtract.rhQty), 0),
    qty: Math.max(toNumber(base.qty) - toNumber(subtract.qty), 0),
    total: Math.max(toNumber(base.total) - toNumber(subtract.total), 0),
  });
}
