"use client";
import { OpenInventoryStockSheet } from "@/components/open-inventory-stock-sheet";
import { InventoryStockAuditColumnVisibility } from "@/components/tables-2/inventory-stock-audit/column-visibility";
import { useInventoryStockParams } from "@/hooks/use-inventory-stock-params";
import { Input } from "@gnd/ui/input";
export function InventoryStockHeader() {
	const { stockAuditSearch, setParams } = useInventoryStockParams();
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<Input
				aria-label="Search audit categories"
				placeholder="Search audit categories…"
				className="w-full sm:max-w-xs"
				value={stockAuditSearch}
				onChange={(event) =>
					setParams({ stockAuditSearch: event.target.value || null })
				}
			/>
			<div className="flex items-center gap-2">
				<InventoryStockAuditColumnVisibility />
				<OpenInventoryStockSheet />
			</div>
		</div>
	);
}
