"use client";
import { InventoryStockFormProvider } from "@/components/forms/inventory-stock/form-context";
import { InventoryStockContent } from "@/components/inventory-stock-content";
import { useInventoryStockParams } from "@/hooks/use-inventory-stock-params";
import { Sheet } from "@gnd/ui/sheet";
export function InventoryStockSheet() {
	const {
		stockOperation,
		stockInventoryId,
		stockVariantId,
		stockLocationId,
		setParams,
	} = useInventoryStockParams();
	return (
		<Sheet
			open={stockOperation === "adjust"}
			onOpenChange={(open) => {
				if (!open)
					void setParams({
						stockOperation: null,
						stockInventoryId: null,
						stockVariantId: null,
						stockLocationId: null,
					});
			}}
		>
			{stockOperation === "adjust" ? (
				<InventoryStockFormProvider
					key={`${stockInventoryId}:${stockVariantId}:${stockLocationId}`}
					inventoryId={stockInventoryId ?? undefined}
					initialVariantId={stockVariantId ?? undefined}
					initialStockId={stockLocationId ?? undefined}
				>
					<InventoryStockContent />
				</InventoryStockFormProvider>
			) : null}
		</Sheet>
	);
}
