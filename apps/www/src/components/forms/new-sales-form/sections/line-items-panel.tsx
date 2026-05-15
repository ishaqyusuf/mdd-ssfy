"use client";

import {
	SalesFormLineItemsPanel,
	type SalesFormLineItemUiRecord,
} from "@gnd/sales/sales-form";
import { useNewSalesFormStore } from "../store";

export function LineItemsPanel() {
	const record = useNewSalesFormStore((s) => s.record);
	const updateLineItem = useNewSalesFormStore((s) => s.updateLineItem);
	const removeLineItem = useNewSalesFormStore((s) => s.removeLineItem);
	const addLineItem = useNewSalesFormStore((s) => s.addLineItem);

	return (
		<SalesFormLineItemsPanel
			lineItems={(record?.lineItems || []) as SalesFormLineItemUiRecord[]}
			onAddLineItem={() => addLineItem()}
			onUpdateLineItem={(uid, patch) => updateLineItem(uid, patch)}
			onRemoveLineItem={removeLineItem}
		/>
	);
}
