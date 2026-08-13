import {
	type SalesFormEditorState,
	type SalesFormSaveStatus,
	type SalesFormState,
	addSalesFormLineItem,
	clearSalesFormDirty,
	createInitialSalesFormState,
	duplicateSalesFormLineItem,
	hydrateSalesFormState,
	markSalesFormError,
	markSalesFormSaved,
	markSalesFormSaving,
	markSalesFormStale,
	moveSalesFormLineItem,
	patchSalesFormRecord,
	removeSalesFormExtraCost,
	removeSalesFormLineItem,
	restoreSalesFormLocalDraft,
	setSalesFormCustomerProfileMeta,
	setSalesFormEditorState,
	setSalesFormExtraCosts,
	setSalesFormLineItems,
	setSalesFormMeta,
	setSalesFormSummary,
	setSalesFormTaxRate,
	updateSalesFormLineItem,
	upsertSalesFormExtraCost,
} from "@gnd/sales/sales-form";
import { create } from "zustand";
import type {
	NewSalesFormExtraCost,
	NewSalesFormLineItem,
	NewSalesFormMeta,
	NewSalesFormRecord,
	NewSalesFormSummary,
} from "./schema";

export type SaveStatus = SalesFormSaveStatus;
export type NewSalesFormEditorState = SalesFormEditorState;
export type NewSalesFormState = Omit<SalesFormState, "record"> & {
	record: NewSalesFormRecord | null;
};

type NewSalesFormActions = {
	reset: () => void;
	hydrate: (record: NewSalesFormRecord) => void;
	restoreLocalDraft: (record: NewSalesFormRecord) => void;
	setMeta: (patch: Partial<NewSalesFormMeta>) => void;
	setCustomerProfileMeta: (
		patch: Partial<NewSalesFormMeta>,
		previousProfileCoefficient?: number | null,
		nextProfileCoefficient?: number | null,
	) => void;
	setLineItems: (lineItems: NewSalesFormLineItem[]) => void;
	setExtraCosts: (costs: NewSalesFormExtraCost[]) => void;
	upsertExtraCost: (
		cost: Partial<NewSalesFormExtraCost>,
		index?: number,
	) => void;
	removeExtraCost: (index: number) => void;
	addLineItem: (line?: Partial<NewSalesFormLineItem>) => void;
	duplicateLineItem: (uid: string) => void;
	moveLineItem: (uid: string, targetIndex: number) => void;
	updateLineItem: (uid: string, patch: Partial<NewSalesFormLineItem>) => void;
	removeLineItem: (uid: string) => void;
	setTaxRate: (taxRate: number) => void;
	setSummary: (summary: NewSalesFormSummary) => void;
	patchRecord: (patch: Partial<NewSalesFormRecord>) => void;
	setSpecialOrder: (patch: Partial<NewSalesFormRecord["specialOrder"]>) => void;
	markSaving: () => void;
	markSaved: (payload: {
		version?: string;
		updatedAt?: string | null;
		preserveDirty?: boolean;
	}) => void;
	markError: (message: string) => void;
	markStale: (message?: string) => void;
	clearDirty: () => void;
	setEditor: (patch: Partial<NewSalesFormEditorState>) => void;
};

export type NewSalesFormStore = NewSalesFormState & NewSalesFormActions;

const initialState = createInitialSalesFormState() as NewSalesFormState;

function applySalesFormState(
	reducer: (state: SalesFormState) => SalesFormState,
) {
	return (state: NewSalesFormStore) =>
		reducer(state as unknown as SalesFormState) as NewSalesFormStore;
}

export const useNewSalesFormStore = create<NewSalesFormStore>((set) => ({
	...initialState,
	reset: () => set(createInitialSalesFormState() as NewSalesFormState),
	hydrate: (record) =>
		set(
			applySalesFormState((state) =>
				hydrateSalesFormState(state, record as any),
			),
		),
	restoreLocalDraft: (record) =>
		set(
			applySalesFormState((state) =>
				restoreSalesFormLocalDraft(state, record as any),
			),
		),
	setMeta: (patch) =>
		set(applySalesFormState((state) => setSalesFormMeta(state, patch))),
	setCustomerProfileMeta: (
		patch,
		previousProfileCoefficient,
		nextProfileCoefficient,
	) =>
		set(
			applySalesFormState((state) =>
				setSalesFormCustomerProfileMeta(
					state,
					patch,
					previousProfileCoefficient,
					nextProfileCoefficient,
				),
			),
		),
	setLineItems: (lineItems) =>
		set(
			applySalesFormState((state) => setSalesFormLineItems(state, lineItems)),
		),
	setExtraCosts: (costs) =>
		set(applySalesFormState((state) => setSalesFormExtraCosts(state, costs))),
	upsertExtraCost: (cost, index) =>
		set(
			applySalesFormState((state) =>
				upsertSalesFormExtraCost(state, cost, index),
			),
		),
	removeExtraCost: (index) =>
		set(applySalesFormState((state) => removeSalesFormExtraCost(state, index))),
	addLineItem: (line) =>
		set(applySalesFormState((state) => addSalesFormLineItem(state, line))),
	duplicateLineItem: (uid) =>
		set(applySalesFormState((state) => duplicateSalesFormLineItem(state, uid))),
	moveLineItem: (uid, targetIndex) =>
		set(
			applySalesFormState((state) =>
				moveSalesFormLineItem(state, uid, targetIndex),
			),
		),
	updateLineItem: (uid, patch) =>
		set(
			applySalesFormState((state) =>
				updateSalesFormLineItem(state, uid, patch),
			),
		),
	removeLineItem: (uid) =>
		set(applySalesFormState((state) => removeSalesFormLineItem(state, uid))),
	setTaxRate: (taxRate) =>
		set(applySalesFormState((state) => setSalesFormTaxRate(state, taxRate))),
	setSummary: (summary) =>
		set(applySalesFormState((state) => setSalesFormSummary(state, summary))),
	patchRecord: (patch) =>
		set(applySalesFormState((state) => patchSalesFormRecord(state, patch))),
	setSpecialOrder: (patch) =>
		set((state) => {
			if (!state.record) return state;
			return {
				...state,
				record: {
					...state.record,
					specialOrder: {
						...state.record.specialOrder,
						...patch,
					},
				},
				dirty: true,
				saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
			};
		}),
	markSaving: () =>
		set(applySalesFormState((state) => markSalesFormSaving(state))),
	markSaved: (payload) =>
		set(applySalesFormState((state) => markSalesFormSaved(state, payload))),
	markError: (message) =>
		set(applySalesFormState((state) => markSalesFormError(state, message))),
	markStale: (message) =>
		set(applySalesFormState((state) => markSalesFormStale(state, message))),
	clearDirty: () =>
		set(applySalesFormState((state) => clearSalesFormDirty(state))),
	setEditor: (patch) =>
		set(applySalesFormState((state) => setSalesFormEditorState(state, patch))),
}));
