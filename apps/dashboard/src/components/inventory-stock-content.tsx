"use client";
import { InventoryStockAdjustmentForm } from "@/components/forms/inventory-stock-adjustment-form";
import { InventoryStockSheetHeader } from "@/components/inventory-stock-sheet-header";
import { SheetContent } from "@gnd/ui/sheet";
export function InventoryStockContent() {
	return (
		<SheetContent className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-xl">
			<InventoryStockSheetHeader />
			<InventoryStockAdjustmentForm />
		</SheetContent>
	);
}
