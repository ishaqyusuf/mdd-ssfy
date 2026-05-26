import {
	hydrateSalesFormRecord,
	normalizeSalesFormMeta,
	repriceSalesFormLineItemsForProfile,
} from "../../application";
import { initialSalesFormEditorState } from "../initial-state";
import {
	getInitialSalesFormActiveStepByLine,
	getFirstSalesFormLineItemUid,
	recomputeSalesFormRecordSummary,
} from "../selectors";
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
			activeStepByLine: getInitialSalesFormActiveStepByLine(hydratedRecord),
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
			activeStepByLine: {
				...getInitialSalesFormActiveStepByLine(hydratedRecord),
				...state.editor.activeStepByLine,
			},
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

export function setSalesFormCustomerProfileMeta<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(
	state: TState,
	patch: Partial<TRecord["form"]>,
	previousProfileCoefficient?: number | null,
	nextProfileCoefficient?: number | null,
): TState {
	if (!state.record) return state;
	const nextForm = normalizeSalesFormMeta({
		...state.record.form,
		...patch,
	});
	const nextLineItems = repriceSalesFormLineItemsForProfile(
		state.record.lineItems || [],
		previousProfileCoefficient,
		nextProfileCoefficient,
	);
	const formUnchanged =
		JSON.stringify(state.record.form || {}) === JSON.stringify(nextForm);
	const linesUnchanged =
		JSON.stringify(state.record.lineItems || []) ===
		JSON.stringify(nextLineItems);
	if (formUnchanged && linesUnchanged) return state;

	return {
		...state,
		record: recomputeSalesFormRecordSummary({
			...state.record,
			form: nextForm,
			lineItems: nextLineItems,
		} as TRecord),
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
