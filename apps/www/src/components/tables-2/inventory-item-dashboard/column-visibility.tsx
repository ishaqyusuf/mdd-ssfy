"use client";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";

import { useInventoryItemDashboardTableStore } from "./store";
import type { InventoryItemDashboardTableId } from "./types";

const labels: Record<InventoryItemDashboardTableId, string> = {
	"inventory-item-variants": "Variant columns",
	"inventory-item-stocks": "Stock columns",
	"inventory-item-movements": "Movement columns",
	"inventory-item-inbound-demands": "Inbound demand columns",
	"inventory-item-allocations": "Allocation columns",
	"inventory-item-related-lines": "Related line columns",
};

type Props = {
	tableId: InventoryItemDashboardTableId;
};

export function InventoryItemDashboardColumnVisibility({ tableId }: Props) {
	const tableState = useInventoryItemDashboardTableStore(
		(state) =>
			state.tables[tableId] ?? {
				columns: [],
				showColumnDividers: false,
			},
	);
	const setShowColumnDividers = useInventoryItemDashboardTableStore(
		(state) => state.setShowColumnDividers,
	);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="icon" aria-label={labels[tableId]}>
					<Icons.Tune size={18} />
				</Button>
			</PopoverTrigger>

			<PopoverContent className="w-[240px] p-0" align="end" sideOffset={8}>
				<div className="flex max-h-[450px] flex-col space-y-2 overflow-auto p-4">
					<div className="flex items-center space-x-2">
						<Checkbox
							id={`${tableId}-column-dividers`}
							checked={tableState.showColumnDividers}
							onCheckedChange={(checked) =>
								setShowColumnDividers(tableId, checked === true)
							}
						/>
						<label
							htmlFor={`${tableId}-column-dividers`}
							className="text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Column dividers
						</label>
					</div>
					<div className="my-1 border-t border-border" />
					{tableState.columns
						.filter(
							(column) =>
								column.columnDef.enableHiding !== false &&
								column.id !== "actions",
						)
						.map((column) => {
							const meta = column.columnDef.meta as
								| { headerLabel?: string }
								| undefined;
							const label =
								meta?.headerLabel ??
								column.columnDef.header?.toString() ??
								column.id;

							return (
								<div key={column.id} className="flex items-center space-x-2">
									<Checkbox
										id={`${tableId}-${column.id}`}
										checked={column.getIsVisible()}
										onCheckedChange={(checked) =>
											column.toggleVisibility(checked === true)
										}
									/>
									<label
										htmlFor={`${tableId}-${column.id}`}
										className="text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
									>
										{label}
									</label>
								</div>
							);
						})}
				</div>
			</PopoverContent>
		</Popover>
	);
}
