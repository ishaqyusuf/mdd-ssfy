import {
	type SalesFormLineItemUiRecord,
	type SalesFormState,
	addSalesFormLineItem,
	createDealerSalesFormLineItem,
	duplicateSalesFormLineItem,
	moveSalesFormLineItem,
	removeSalesFormLineItem,
	updateSalesFormLineItem,
} from "@gnd/sales/sales-form";
import type React from "react";
import { useMemo } from "react";
import type { DealerSalesFormState } from "../types";

type DealerSalesFormStateController = {
	setState: React.Dispatch<React.SetStateAction<DealerSalesFormState>>;
};

function toSharedState(state: DealerSalesFormState) {
	return state as unknown as SalesFormState;
}

function toDealerState(state: SalesFormState) {
	return state as unknown as DealerSalesFormState;
}

export function useSalesFormActions(
	controller: DealerSalesFormStateController,
) {
	return useMemo(
		() => ({
			addLineItem: () => {
				controller.setState((current) =>
					toDealerState(
						addSalesFormLineItem(
							toSharedState(current),
							createDealerSalesFormLineItem(
								current.record?.lineItems.length || 0,
							),
						),
					),
				);
			},
			updateLineItem: (
				uid: string,
				patch: Partial<SalesFormLineItemUiRecord>,
			) => {
				controller.setState((current) =>
					toDealerState(
						updateSalesFormLineItem(toSharedState(current), uid, patch),
					),
				);
			},
			duplicateLineItem: (uid: string) => {
				controller.setState((current) =>
					toDealerState(
						duplicateSalesFormLineItem(toSharedState(current), uid),
					),
				);
			},
			moveLineItem: (uid: string, targetIndex: number) => {
				controller.setState((current) =>
					toDealerState(
						moveSalesFormLineItem(toSharedState(current), uid, targetIndex),
					),
				);
			},
			removeLineItem: (uid: string) => {
				controller.setState((current) => {
					if ((current.record?.lineItems.length || 0) <= 1) return current;
					return toDealerState(
						removeSalesFormLineItem(toSharedState(current), uid),
					);
				});
			},
		}),
		[controller],
	);
}
