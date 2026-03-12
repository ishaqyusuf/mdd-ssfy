import type { DispatchOverviewItem } from "../../../types/dispatch.types";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";

export type PackingDraft = {
  qty: number;
  lh: number;
  rh: number;
};

type UsePackingSlipDraftsInput = {
  isOpen: boolean;
  packableItems: DispatchOverviewItem[];
};

function asNumber(v?: number | null) {
  return Number(v || 0);
}

function itemHasSingleQty(item: DispatchOverviewItem) {
  return asNumber((item?.deliverableQty as any)?.qty) > 0;
}

function qtyTotal(qty?: { qty?: number | null; lh?: number | null; rh?: number | null }) {
  const q = asNumber(qty?.qty);
  if (q > 0) return q;
  return asNumber(qty?.lh) + asNumber(qty?.rh);
}

function parseQtyInput(value: string) {
  const numeric = value.replace(/[^0-9]/g, "");
  if (!numeric) return 0;
  const parsed = Number.parseInt(numeric, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function usePackingSlipDrafts({
  isOpen,
  packableItems,
}: UsePackingSlipDraftsInput) {
  const [packingDrafts, setPackingDrafts] = useState<Record<string, PackingDraft>>(
    {},
  );

  useEffect(() => {
    if (!isOpen) return;
    setPackingDrafts(
      Object.fromEntries(
        packableItems.map((item) => {
          const listed = (item?.listedQty || {}) as any;
          const hasSingle = itemHasSingleQty(item);
          const qty = hasSingle ? asNumber(listed?.qty) : 0;
          const lh = hasSingle ? 0 : asNumber(listed?.lh);
          const rh = hasSingle ? 0 : asNumber(listed?.rh);
          return [item.uid, { qty, lh, rh } satisfies PackingDraft];
        }),
      ),
    );
  }, [isOpen, packableItems]);

  const updateDraft = (
    uid: string,
    updater: (prev: PackingDraft) => PackingDraft,
  ) => {
    setPackingDrafts((prev) => {
      const base = prev[uid] || { qty: 0, lh: 0, rh: 0 };
      return {
        ...prev,
        [uid]: updater(base),
      };
    });
  };

  const adjustSingle = (uid: string, max: number, diff: number) => {
    updateDraft(uid, (prev) => {
      const nextQty = Math.max(0, Math.min(max, prev.qty + diff));
      return { ...prev, qty: nextQty };
    });
    Haptics.selectionAsync().catch(() => undefined);
  };

  const setSingleValue = (uid: string, max: number, nextValue: number) => {
    updateDraft(uid, (prev) => ({
      ...prev,
      qty: Math.max(0, Math.min(max, nextValue)),
    }));
  };

  const adjustSide = (
    uid: string,
    side: "lh" | "rh",
    max: number,
    diff: number,
  ) => {
    updateDraft(uid, (prev) => {
      const next = Math.max(0, Math.min(max, (prev[side] || 0) + diff));
      return { ...prev, [side]: next };
    });
    Haptics.selectionAsync().catch(() => undefined);
  };

  const setSideValue = (
    uid: string,
    side: "lh" | "rh",
    max: number,
    nextValue: number,
  ) => {
    updateDraft(uid, (prev) => ({
      ...prev,
      [side]: Math.max(0, Math.min(max, nextValue)),
    }));
  };

  const progressPacked = useMemo(() => {
    return packableItems.reduce((total, item) => {
      const d = packingDrafts[item.uid];
      if (!d) return total;
      const packed = itemHasSingleQty(item) ? d.qty : d.lh + d.rh;
      return total + packed;
    }, 0);
  }, [packableItems, packingDrafts]);

  const progressTotal = useMemo(() => {
    return packableItems.reduce((total, item) => {
      return total + qtyTotal(item?.deliverableQty as any);
    }, 0);
  }, [packableItems]);

  return {
    packingDrafts,
    setPackingDrafts,
    adjustSingle,
    setSingleValue,
    adjustSide,
    setSideValue,
    progressPacked,
    progressTotal,
    parseQtyInput,
    asNumber,
    itemHasSingleQty,
  };
}
