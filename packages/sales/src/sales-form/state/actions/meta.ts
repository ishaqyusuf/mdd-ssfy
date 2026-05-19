import {
	hydrateSalesFormRecord,
	normalizeSalesFormMeta,
} from "../../application";
import { initialSalesFormEditorState } from "../initial-state";
import { getFirstSalesFormLineItemUid } from "../selectors";
import type { SalesFormState, SalesFormStateRecord } from "../types";

export function hydrateSalesFormState<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(state: TState, record: TRecord): TState {
	const hydratedRecord = hydrateSalesFormRecord(record) as TRecord;

	return {
		...state,
		record: hydratedRecord,
		dirty: false,
		saveStatus: "idle",
		lastSaveError: null,
		lastSavedAt: record.updatedAt || null,
		editor: {
			...initialSalesFormEditorState,
			activeItem: getFirstSalesFormLineItemUid(hydratedRecord),
		},
	};
}

export function restoreSalesFormLocalDraft<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(state: TState, record: TRecord): TState {
	const hydratedRecord = hydrateSalesFormRecord(record) as TRecord;

	return {
		...state,
		record: hydratedRecord,
		dirty: true,
		saveStatus: "idle",
		lastSaveError: null,
		editor: {
			...state.editor,
			activeItem: getFirstSalesFormLineItemUid(hydratedRecord),
		},
	};
}

export function setSalesFormMeta<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(state: TState, patch: Partial<TRecord["form"]>): TState {
	if (!state.record) return state;
	const unchanged = Object.entries(patch || {}).every(
		([key, value]) => state.record?.form?.[key] === value,
	);
	if (unchanged) return state;

	return {
		...state,
		record: {
			...state.record,
			form: normalizeSalesFormMeta({
				...state.record.form,
				...patch,
			}),
		} as TRecord,
		dirty: true,
		saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
	};
}

export function patchSalesFormRecord<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(state: TState, patch: Partial<TRecord>): TState {
	if (!state.record) return state;
	const unchanged = Object.entries(patch).every(
		([key, value]) => state.record?.[key] === value,
	);
	if (unchanged) return state;

	return {
		...state,
		record: {
			...state.record,
			...patch,
		},
	};
}

