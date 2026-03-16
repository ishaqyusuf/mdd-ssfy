import { create } from "zustand";
import type {
    NewSalesFormExtraCost,
    NewSalesFormLineItem,
    NewSalesFormMeta,
    NewSalesFormRecord,
    NewSalesFormSummary,
    SaveStatus,
} from "./schema";
import {
    computeSummary,
    createEmptyLineItem,
    hydrateRecord,
    normalizeExtraCosts,
    normalizeLineItem,
    normalizeMeta,
} from "./mappers";
import { endFlow, logStage, startFlow } from "@/lib/dev-flow-logger";

type StepDisplayMode = "compact" | "extended";
type ActiveItem = string | null;
type DoorViewMode = "selection" | "package";
type MouldingViewMode = "selection" | "lineItems";

export type NewSalesFormEditorState = {
    stepDisplayMode: StepDisplayMode;
    activeItem: ActiveItem;
    doorViewMode: DoorViewMode;
    mouldingViewMode: MouldingViewMode;
    isOverviewOpen: boolean;
    showMobileSummary: boolean;
    autosaveEnabled: boolean;
};

export type NewSalesFormState = {
    record: NewSalesFormRecord | null;
    dirty: boolean;
    lastSaveError: string | null;
    saveStatus: SaveStatus;
    lastSavedAt: string | null;
    editor: NewSalesFormEditorState;
};

type NewSalesFormActions = {
    reset: () => void;
    hydrate: (record: NewSalesFormRecord) => void;
    restoreLocalDraft: (record: NewSalesFormRecord) => void;
    setMeta: (patch: Partial<NewSalesFormMeta>) => void;
    setLineItems: (lineItems: NewSalesFormLineItem[]) => void;
    setExtraCosts: (costs: NewSalesFormExtraCost[]) => void;
    upsertExtraCost: (cost: Partial<NewSalesFormExtraCost>, index?: number) => void;
    removeExtraCost: (index: number) => void;
    addLineItem: (line?: Partial<NewSalesFormLineItem>) => void;
    updateLineItem: (uid: string, patch: Partial<NewSalesFormLineItem>) => void;
    removeLineItem: (uid: string) => void;
    setTaxRate: (taxRate: number) => void;
    setSummary: (summary: NewSalesFormSummary) => void;
    patchRecord: (patch: Partial<NewSalesFormRecord>) => void;
    markSaving: () => void;
    markSaved: (payload: { version?: string; updatedAt?: string | null }) => void;
    markError: (message: string) => void;
    markStale: (message?: string) => void;
    clearDirty: () => void;
    setEditor: (patch: Partial<NewSalesFormEditorState>) => void;
};

export type NewSalesFormStore = NewSalesFormState & NewSalesFormActions;

const initialEditorState: NewSalesFormEditorState = {
    stepDisplayMode: "extended",
    activeItem: null,
    doorViewMode: "selection",
    mouldingViewMode: "selection",
    isOverviewOpen: false,
    showMobileSummary: false,
    autosaveEnabled: false,
};

const initialState: NewSalesFormState = {
    record: null,
    dirty: false,
    lastSaveError: null,
    saveStatus: "idle",
    lastSavedAt: null,
    editor: initialEditorState,
};

function withDirty(record: NewSalesFormRecord | null) {
    if (!record) return null;
    const summary = computeSummary(
        record.lineItems,
        record.summary?.taxRate || 0,
        normalizeExtraCosts(record.extraCosts || []),
        record.form?.paymentMethod || null,
        (record as any).settings?.cccPercentage,
    );
    return {
        ...record,
        summary: {
            ...record.summary,
            ...summary,
        },
    };
}

export const useNewSalesFormStore = create<NewSalesFormStore>((set) => ({
    ...initialState,
    reset: () => set({ ...initialState }),
    hydrate: (record) =>
        set({
            record: hydrateRecord(record),
            dirty: false,
            saveStatus: "idle",
            lastSaveError: null,
            lastSavedAt: record.updatedAt || null,
            editor: {
                ...initialEditorState,
                activeItem: record.lineItems?.[0]?.uid || null,
            },
        }),
    restoreLocalDraft: (record) =>
        set((state) => ({
            ...state,
            record: hydrateRecord(record),
            dirty: true,
            saveStatus: "idle",
            lastSaveError: null,
            editor: {
                ...state.editor,
                activeItem: record.lineItems?.[0]?.uid || null,
            },
        })),
    setMeta: (patch) =>
        set((state) => {
            if (!state.record) return state;
            return {
                ...state,
                record: withDirty({
                    ...state.record,
                    form: normalizeMeta({
                        ...state.record.form,
                        ...patch,
                    }),
                }),
                dirty: true,
                saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
            };
        }),
    setLineItems: (lineItems) =>
        set((state) => {
            if (!state.record) return state;
            return {
                ...state,
                record: withDirty({
                    ...state.record,
                    lineItems: lineItems.map((line, index) =>
                        normalizeLineItem(line, index),
                    ),
                }),
                dirty: true,
                saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
            };
        }),
    setExtraCosts: (costs) =>
        set((state) => {
            if (!state.record) return state;
            return {
                ...state,
                record: withDirty({
                    ...state.record,
                    extraCosts: normalizeExtraCosts(costs),
                }),
                dirty: true,
                saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
            };
        }),
    upsertExtraCost: (cost, index) =>
        set((state) => {
            if (!state.record) return state;
            const costs = normalizeExtraCosts(state.record.extraCosts || []);
            if (typeof index === "number" && costs[index]) {
                costs[index] = {
                    ...costs[index],
                    ...cost,
                    amount: Number(cost.amount ?? (costs[index].amount || 0)),
                };
            } else {
                costs.push({
                    id: cost.id ?? null,
                    label: (cost.label || "Custom").trim(),
                    type: (cost.type || "CustomNonTaxxable") as any,
                    amount: Number(cost.amount || 0),
                    taxxable: cost.taxxable ?? false,
                });
            }
            return {
                ...state,
                record: withDirty({
                    ...state.record,
                    extraCosts: normalizeExtraCosts(costs),
                }),
                dirty: true,
                saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
            };
        }),
    removeExtraCost: (index) =>
        set((state) => {
            if (!state.record) return state;
            const costs = normalizeExtraCosts(state.record.extraCosts || []).filter(
                (_, i) => i !== index,
            );
            return {
                ...state,
                record: withDirty({
                    ...state.record,
                    extraCosts: normalizeExtraCosts(costs),
                }),
                dirty: true,
                saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
            };
        }),
    addLineItem: (line) =>
        set((state) => {
            if (!state.record) return state;
            const next = normalizeLineItem(
                line || createEmptyLineItem(state.record.lineItems.length),
                state.record.lineItems.length,
            );
            return {
                ...state,
                record: withDirty({
                    ...state.record,
                    lineItems: [...state.record.lineItems, next],
                }),
                editor: {
                    ...state.editor,
                    activeItem: next.uid,
                },
                dirty: true,
                saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
            };
        }),
    updateLineItem: (uid, patch) =>
        set((state) => {
            if (!state.record) return state;
            const shouldLogShelf =
                Object.prototype.hasOwnProperty.call(patch, "shelfItems") ||
                Object.prototype.hasOwnProperty.call(patch, "lineTotal");
            const flow = shouldLogShelf
                ? startFlow({
                      feature: "new-sales-form/store",
                      threadContext: "update-line-item",
                      tags: ["debug", "dev-only", "shelf"],
                      inputs: {
                          uid,
                          patch,
                      },
                  })
                : null;
            const lineItems = state.record.lineItems.map((line, index) => {
                if (line.uid !== uid) return line;
                const merged: Partial<NewSalesFormLineItem> = {
                    ...line,
                    ...patch,
                    uid,
                };
                if (
                    patch.lineTotal == null &&
                    (Object.prototype.hasOwnProperty.call(patch, "qty") ||
                        Object.prototype.hasOwnProperty.call(patch, "unitPrice"))
                ) {
                    merged.lineTotal =
                        Math.round(
                            (Number(merged.qty || 0) *
                                Number(merged.unitPrice || 0) +
                                Number.EPSILON) *
                                100,
                        ) / 100;
                }
                if (flow) {
                    logStage(flow, {
                        stage: "transform",
                        eventType: "payload.transformed",
                        outputs: {
                            mergedLine: {
                                qty: merged.qty,
                                unitPrice: merged.unitPrice,
                                lineTotal: merged.lineTotal,
                                shelfItems: (merged.shelfItems || []).map((row: any) => ({
                                    productId: row?.productId,
                                    qty: row?.qty,
                                    unitPrice: row?.unitPrice,
                                    totalPrice: row?.totalPrice,
                                })),
                            },
                        },
                    });
                }
                return normalizeLineItem(merged, index);
            });
            const nextRecord = withDirty({
                ...state.record,
                lineItems,
            });
            if (flow) {
                logStage(flow, {
                    stage: "derive",
                    eventType: "response.received",
                    outputs: {
                        updatedLine: lineItems.find((line) => line.uid === uid),
                        summary: nextRecord?.summary,
                    },
                });
                endFlow(flow, {
                    uid,
                    subTotal: nextRecord?.summary?.subTotal,
                    grandTotal: nextRecord?.summary?.grandTotal,
                });
            }
            return {
                ...state,
                record: nextRecord,
                dirty: true,
                saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
            };
        }),
    removeLineItem: (uid) =>
        set((state) => {
            if (!state.record) return state;
            return {
                ...state,
                record: withDirty({
                    ...state.record,
                    lineItems: state.record.lineItems.filter((line) => line.uid !== uid),
                }),
                editor: {
                    ...state.editor,
                    activeItem:
                        state.editor.activeItem === uid
                            ? state.record.lineItems.find((line) => line.uid !== uid)?.uid ||
                              null
                            : state.editor.activeItem,
                },
                dirty: true,
                saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
            };
        }),
    setTaxRate: (taxRate) =>
        set((state) => {
            if (!state.record) return state;
            const nextTaxRate = Number(taxRate || 0);
            if (Number(state.record.summary?.taxRate || 0) === nextTaxRate) {
                return state;
            }
            return {
                ...state,
                record: withDirty({
                    ...state.record,
                    summary: {
                        ...state.record.summary,
                        taxRate: nextTaxRate,
                    },
                }),
                dirty: true,
                saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
            };
        }),
    setSummary: (summary) =>
        set((state) => {
            if (!state.record) return state;
            return {
                ...state,
                record: {
                    ...state.record,
                    summary,
                },
                dirty: true,
                saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
            };
        }),
    patchRecord: (patch) =>
        set((state) => {
            if (!state.record) return state;
            return {
                ...state,
                record: {
                    ...state.record,
                    ...patch,
                },
            };
        }),
    markSaving: () =>
        set((state) => ({
            ...state,
            saveStatus: "saving",
            lastSaveError: null,
        })),
    markSaved: ({ version, updatedAt }) =>
        set((state) => ({
            ...state,
            record: !state.record
                ? state.record
                : {
                      ...state.record,
                      version: version ?? state.record.version,
                      updatedAt: updatedAt ?? state.record.updatedAt,
                  },
            saveStatus: "saved",
            dirty: false,
            lastSaveError: null,
            lastSavedAt: updatedAt ?? state.lastSavedAt ?? new Date().toISOString(),
        })),
    markError: (message) =>
        set((state) => ({
            ...state,
            saveStatus: "error",
            lastSaveError: message,
        })),
    markStale: (message) =>
        set((state) => ({
            ...state,
            saveStatus: "stale",
            lastSaveError: message || "Your form is out of date.",
        })),
    clearDirty: () =>
        set((state) => ({
            ...state,
            dirty: false,
        })),
    setEditor: (patch) =>
        set((state) => ({
            ...state,
            editor: {
                ...state.editor,
                ...patch,
            },
        })),
}));
