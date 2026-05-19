import {
	addSalesFormLineItem,
	removeSalesFormLineItem,
	updateSalesFormLineItem,
	type SalesFormLineItemUiRecord,
} from "@gnd/sales/sales-form";
import type React from "react";
import { useMemo } from "react";
import { createDealerLineItem } from "./use-sales-form-state";
import type { DealerSalesFormState } from "../types";

type DealerSalesFormStateController = {
	setState: React.Dispatch<React.SetStateAction<DealerSalesFormState>>;
};

export function useSalesFormActions(controller: DealerSalesFormStateController) {
	return useMemo(
		() => ({
			addLineItem: () => {
				controller.setState(
					(current) =>
						addSalesFormLineItem(
							current as any,
							createDealerLineItem(current.record?.lineItems.length || 0),
						) as DealerSalesFormState,
				);
			},
			updateLineItem: (
				uid: string,
				patch: Partial<SalesFormLineItemUiRecord>,
			) => {
				controller.setState(
					(current) =>
						updateSalesFormLineItem(
							current as any,
							uid,
							patch,
						) as DealerSalesFormState,
				);
			},
			removeLineItem: (uid: string) => {
				controller.setState((current) => {
					if ((current.record?.lineItems.length || 0) <= 1) return current;
					return removeSalesFormLineItem(
						current as any,
						uid,
					) as DealerSalesFormState;
				});
			},
		}),
		[controller],
	);
}
