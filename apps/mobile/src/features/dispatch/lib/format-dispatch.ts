import { QtyMatrix } from "../types/dispatch.types";
import { formatDate } from "@gnd/utils/dayjs";

function asNumber(v?: number | null) {
  return Number(v || 0);
}

export function formatDispatchDate(value?: Date | string | null) {
  if (!value) return "N/A";
  return formatDate(value as any);
}

export function formatQty(qty?: QtyMatrix | null) {
  if (!qty) return "0";
  const hasSingleQty = asNumber(qty.qty) > 0;
  if (hasSingleQty) return `${asNumber(qty.qty)}`;
  return `LH ${asNumber(qty.lh)} / RH ${asNumber(qty.rh)}`;
}

export function totalQty(qty?: QtyMatrix | null) {
  if (!qty) return 0;
  if (asNumber(qty.qty) > 0) return asNumber(qty.qty);
  return asNumber(qty.lh) + asNumber(qty.rh);
}
