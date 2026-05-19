import { recomputeSalesFormRecordSummary } from "../selectors";
import type { SalesFormState, SalesFormStateRecord } from "../types";

export function setSalesFormTaxRate<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(state: TState, taxRate: number): TState {
	if (!state.record) return state;
	const nextTaxRate = Number(taxRate || 0);
	if (Number(state.record.summary?.taxRate || 0) === nextTaxRate) {
		return state;
	}

	return {
		...state,
		record: recomputeSalesFormRecordSummary({
			...state.record,
			summary: {
				...state.record.summary,
				taxRate: nextTaxRate,
			},
		} as TRecord),
		dirty: true,
		saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
	};
}

export function setSalesFormSummary<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(state: TState, summary: TRecord["summary"]): TState {
	if (!state.record) return state;
	const currentSummary = (state.record.summary || {}) as Record<string, any>;
	const nextSummary = (summary || {}) as Record<string, any>;
	const unchanged =
		Number(currentSummary.subTotal || 0) === Number(nextSummary.subTotal || 0) &&
		Number(currentSummary.adjustedSubTotal || 0) ===
			Number(nextSummary.adjustedSubTotal || 0) &&
		Number(currentSummary.taxRate || 0) === Number(nextSummary.taxRate || 0) &&
		Number(currentSummary.taxTotal || 0) === Number(nextSummary.taxTotal || 0) &&
		Number(currentSummary.ccc || 0) === Number(nextSummary.ccc || 0) &&
		Number(currentSummary.grandTotal || 0) ===
			Number(nextSummary.grandTotal || 0);
	if (unchanged) return state;

	return {
		...state,
		record: {
			...state.record,
			summary,
		} as TRecord,
		dirty: true,
		saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
	};
}
