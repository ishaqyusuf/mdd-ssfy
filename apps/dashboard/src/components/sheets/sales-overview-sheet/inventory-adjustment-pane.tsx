"use client";

import { InventoryStockAdjustmentForm } from "@/components/forms/inventory-stock-adjustment-form";
import { InventoryStockFormProvider } from "@/components/forms/inventory-stock/form-context";
import type { InventoryAdjustmentSelection } from "@/components/inventory/sales-inventory/pane-context";
import Sheet from "@gnd/ui/custom/sheet-v2";

export function InventoryAdjustmentPane({
	target,
}: { target: InventoryAdjustmentSelection }) {
	return (
		<Sheet.SecondaryContent
			Header={
				<Sheet.SecondaryHeader
					backLabel={
						target.returnNeed ? "Back to inventory need" : "Back to warehouse"
					}
					title="Adjust warehouse stock"
					description="Record the physical count for this item."
				/>
			}
		>
			<InventoryStockFormProvider
				key={`${target.inventoryVariantId}-${target.stockId ?? "choose"}`}
				initialVariantId={target.inventoryVariantId}
				initialStockId={target.stockId}
			>
				<InventoryStockAdjustmentForm />
			</InventoryStockFormProvider>
		</Sheet.SecondaryContent>
	);
}
