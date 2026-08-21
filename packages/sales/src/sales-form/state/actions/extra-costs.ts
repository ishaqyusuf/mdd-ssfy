import {
	normalizeSalesFormExtraCosts,
	normalizeSalesFormMeta,
} from "../../application";
import { recomputeSalesFormRecordSummary } from "../selectors";
import type { SalesFormState, SalesFormStateRecord } from "../types";

export type SalesFormDeliveryOption = "delivery" | "pickup";

export type SetSalesFormDeliveryOptionOptions = {
	removeDeliveryCosts?: boolean;
};

export function countSalesFormDeliveryCosts(
	costs: Array<{ type?: string | null }> = [],
) {
	return costs.filter((cost) => cost.type === "Delivery").length;
}

export function setSalesFormDeliveryOption<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(
	state: TState,
	deliveryOption: SalesFormDeliveryOption,
	options: SetSalesFormDeliveryOptionOptions = {},
): TState {
	if (!state.record) return state;
	if (state.record.form?.deliveryOption === deliveryOption) return state;

	const costs = normalizeSalesFormExtraCosts(state.record.extraCosts || []);
	const deliveryCostCount = countSalesFormDeliveryCosts(costs);
	if (
		deliveryOption === "pickup" &&
		deliveryCostCount > 0 &&
		!options.removeDeliveryCosts
	) {
		return state;
	}

	const nextCosts =
		deliveryOption === "delivery"
			? deliveryCostCount > 0
				? costs
				: [
						...costs,
						{
							id: null,
							label: "Delivery",
							type: "Delivery",
							amount: 0,
							taxxable: false,
						},
					]
			: options.removeDeliveryCosts
				? costs.filter((cost) => cost.type !== "Delivery")
				: costs;

	return {
		...state,
		record: recomputeSalesFormRecordSummary({
			...state.record,
			form: normalizeSalesFormMeta({
				...state.record.form,
				deliveryOption,
			}),
			extraCosts: normalizeSalesFormExtraCosts(nextCosts),
		} as TRecord),
		dirty: true,
		lastSaveError: null,
		saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
	};
}

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
