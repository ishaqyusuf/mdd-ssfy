import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
export function InventoryStockSheetHeader() {
	return (
		<SheetHeader>
			<SheetTitle>Adjust warehouse stock</SheetTitle>
			<SheetDescription>
				Add stock or record a counted quantity. Every change creates a movement
				and audit record.
			</SheetDescription>
		</SheetHeader>
	);
}
