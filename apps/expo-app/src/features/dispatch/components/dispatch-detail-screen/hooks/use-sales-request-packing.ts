import { useMemo, useState } from "react";
import type {
  DispatchOverviewItem,
  QtyMatrix,
} from "../../../types/dispatch.types";

type Selection = {
  selected: boolean;
  qty: number;
  lh: number;
  rh: number;
};

type ItemWithUnavailable = DispatchOverviewItem & {
  nonDeliverableQty?: QtyMatrix | null;
};

type SelectedItem = {
  item: DispatchOverviewItem;
  qty: QtyMatrix;
};

function asNumber(v?: number | null) {
  return Number(v || 0);
}

function hasSingleQty(qty?: QtyMatrix | null) {
  return asNumber(qty?.qty) > 0;
}

function parseQtyInput(value: string) {
  const numeric = value.replace(/[^0-9]/g, "");
  if (!numeric) return 0;
  const parsed = Number.parseInt(numeric, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function useSalesRequestPacking(items: DispatchOverviewItem[]) {
  const unpackableItems = items as ItemWithUnavailable[];
  const [state, setState] = useState<Record<string, Selection>>({});

  const getItemByUid = (uid: string) =>
    unpackableItems.find((item) => item.uid === uid);

  const getUnavailable = (uid: string) => {
    const item = getItemByUid(uid);
    const unavailable = item?.nonDeliverableQty || {};
    const single = hasSingleQty(unavailable);
    return {
      single,
      qty: asNumber(unavailable.qty),
      lh: asNumber(unavailable.lh),
      rh: asNumber(unavailable.rh),
    };
  };

  const getSelection = (uid: string): Selection =>
    state[uid] || { selected: false, qty: 0, lh: 0, rh: 0 };

  const setSelected = (uid: string, selected: boolean) => {
    const unavailable = getUnavailable(uid);
    setState((prev) => ({
      ...prev,
      [uid]: {
        ...(prev[uid] || { selected: false, qty: 0, lh: 0, rh: 0 }),
        selected,
        ...(selected
          ? unavailable.single
            ? { qty: unavailable.qty || 0 }
            : { lh: unavailable.lh || 0, rh: unavailable.rh || 0 }
          : {}),
      },
    }));
  };

  const setQty = (uid: string, key: "qty" | "lh" | "rh", value: number) => {
    const unavailable = getUnavailable(uid);
    const max =
      key === "qty" ? unavailable.qty : key === "lh" ? unavailable.lh : unavailable.rh;
    setState((prev) => ({
      ...prev,
      [uid]: {
        ...(prev[uid] || { selected: false, qty: 0, lh: 0, rh: 0 }),
        [key]: Math.max(0, Math.min(max, value)),
      },
    }));
  };

  const markAll = () => {
    setState((prev) => {
      const next = { ...prev };
      for (const item of unpackableItems) {
        const unavailable = item.nonDeliverableQty || {};
        const single = hasSingleQty(unavailable);
        next[item.uid] = {
          selected: true,
          qty: single ? asNumber(unavailable.qty) : 0,
          lh: single ? 0 : asNumber(unavailable.lh),
          rh: single ? 0 : asNumber(unavailable.rh),
        };
      }
      return next;
    });
  };

  const selectedItems = useMemo(() => {
    return unpackableItems
      .map((item) => {
        const selection = state[item.uid] || {
          selected: false,
          qty: 0,
          lh: 0,
          rh: 0,
        };
        if (!selection.selected) return null;
        const unavailable = item.nonDeliverableQty || {};
        const single = hasSingleQty(unavailable);
        const qty = single
          ? { qty: selection.qty }
          : { lh: selection.lh, rh: selection.rh };
        const total = single
          ? asNumber(selection.qty)
          : asNumber(selection.lh) + asNumber(selection.rh);
        if (total <= 0) return null;
        return { item, qty };
      })
      .filter(Boolean) as SelectedItem[];
  }, [unpackableItems, state]);

  const reset = () => setState({});

  return {
    state,
    getSelection,
    setSelected,
    setQty,
    markAll,
    selectedItems,
    reset,
    parseQtyInput,
    asNumber,
    hasSingleQty,
  };
}
