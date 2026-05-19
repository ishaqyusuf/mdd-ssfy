import { normalizeSalesFormExtraCosts } from "../../application";
import { recomputeSalesFormRecordSummary } from "../selectors";
import type { SalesFormState, SalesFormStateRecord } from "../types";

export function setSalesFormExtraCosts<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(state: TState, costs: Partial<TRecord["extraCosts"][number]>[]): TState {
	if (!state.record) return state;

	return {
		...state,
		record: recomputeSalesFormRecordSummary({
			...state.record,
			extraCosts: normalizeSalesFormExtraCosts(costs),
		} as TRecord),
		dirty: true,
		saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
	};
}

export function upsertSalesFormExtraCost<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(
	state: TState,
	cost: Partial<TRecord["extraCosts"][number]>,
	index?: number,
): TState {
	if (!state.record) return state;
	const costs = normalizeSalesFormExtraCosts(state.record.extraCosts || []);

	if (typeof index === "number" && costs[index]) {
		costs[index] = {
			...costs[index],
			...cost,
			amount: Number(cost.amount ?? costs[index].amount ?? 0),
		};
	} else {
		costs.push({
			id: cost.id ?? null,
			label: (cost.label || "Custom").trim(),
			type: String(cost.type || "CustomNonTaxxable"),
			amount: Number(cost.amount || 0),
			taxxable: cost.taxxable ?? false,
		});
	}

	return {
		...state,
		record: recomputeSalesFormRecordSummary({
			...state.record,
			extraCosts: normalizeSalesFormExtraCosts(costs),
		} as TRecord),
		dirty: true,
		saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
	};
}

export function removeSalesFormExtraCost<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(state: TState, index: number): TState {
	if (!state.record) return state;
	const costs = normalizeSalesFormExtraCosts(state.record.extraCosts || []).filter(
		(_, currentIndex) => currentIndex !== index,
	);

	return {
		...state,
		record: recomputeSalesFormRecordSummary({
			...state.record,
			extraCosts: normalizeSalesFormExtraCosts(costs),
		} as TRecord),
		dirty: true,
		saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
	};
}

