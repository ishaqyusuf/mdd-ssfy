import {
  initialSalesFormEditorState,
  type SalesFormSaveStatus,
  type SalesFormState,
  type SalesFormStateRecord,
} from "@gnd/sales/sales-form-core";
import type {
  NewSalesFormExtraCost,
  NewSalesFormLineItem,
  NewSalesFormMeta,
  NewSalesFormSettings,
  NewSalesFormSummary,
  NewSalesFormType,
} from "../types";

export type MobileSalesFormRecord = SalesFormStateRecord & {
  type: NewSalesFormType;
  salesId: number | null;
  slug: string | null;
  orderId: string | null;
  inventoryStatus: string | null;
  status: string | null;
  version: string | null;
  form: NewSalesFormMeta;
  lineItems: NewSalesFormLineItem[];
  extraCosts: NewSalesFormExtraCost[];
  summary: NewSalesFormSummary;
  settings?: NewSalesFormSettings | null;
};

export type MobileSalesFormState = SalesFormState<MobileSalesFormRecord>;

export type MobileSalesFormSnapshot = {
  type: NewSalesFormType;
  salesId: number | null;
  slug: string | null;
  orderId: string | null;
  inventoryStatus: string | null;
  status: string | null;
  version: string | null;
  meta: NewSalesFormMeta;
  lineItems: NewSalesFormLineItem[];
  extraCosts: NewSalesFormExtraCost[];
  summary: NewSalesFormSummary;
  settings: NewSalesFormSettings | null;
  saveStatus: SalesFormSaveStatus;
  dirty: boolean;
  lastSavedAt: string | null;
};

export function toSharedSalesFormState(
  snapshot: MobileSalesFormSnapshot,
): MobileSalesFormState {
  return {
    record: {
      type: snapshot.type,
      salesId: snapshot.salesId,
      slug: snapshot.slug,
      orderId: snapshot.orderId,
      inventoryStatus: snapshot.inventoryStatus,
      status: snapshot.status,
      version: snapshot.version,
      form: snapshot.meta,
      lineItems: snapshot.lineItems,
      extraCosts: snapshot.extraCosts,
      summary: snapshot.summary,
      settings: snapshot.settings,
    },
    dirty: snapshot.dirty,
    lastSaveError: null,
    saveStatus: snapshot.saveStatus,
    lastSavedAt: snapshot.lastSavedAt,
    editor: initialSalesFormEditorState,
  };
}

export function fromSharedSalesFormState(shared: MobileSalesFormState) {
  const record = shared.record;
  if (!record) return {};

  return {
    meta: record.form as NewSalesFormMeta,
    lineItems: record.lineItems as NewSalesFormLineItem[],
    extraCosts: record.extraCosts as NewSalesFormExtraCost[],
    summary: record.summary as NewSalesFormSummary,
    orderId: record.orderId ?? null,
    inventoryStatus: record.inventoryStatus ?? null,
    status: record.status ?? null,
    settings: (record.settings ?? null) as NewSalesFormSettings | null,
    taxRate: Number(record.summary?.taxRate || 0),
    dirty: shared.dirty,
    saveStatus: shared.saveStatus,
    lastSavedAt: shared.lastSavedAt,
  };
}
