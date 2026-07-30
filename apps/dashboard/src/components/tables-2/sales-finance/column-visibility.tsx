"use client";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";

import { useSalesFinanceTableStore } from "./store";

export function SalesFinanceColumnVisibility() {
	const { columns, showColumnDividers, setShowColumnDividers } =
		useSalesFinanceTableStore();

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="icon" aria-label="Configure columns">
					<Icons.Tune size={18} />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[240px] p-0" align="end" sideOffset={8}>
				<div className="flex max-h-[450px] flex-col gap-2 overflow-auto p-4">
					<div className="flex items-center gap-2 text-sm">
						<Checkbox
							id="sales-finance-column-dividers"
							checked={showColumnDividers}
							onCheckedChange={(checked) =>
								setShowColumnDividers(checked === true)
							}
						/>
						<label htmlFor="sales-finance-column-dividers">
							Column dividers
						</label>
					</div>
					<div className="my-1 border-t" />
					{columns
						.filter(
							(column) =>
								column.columnDef.enableHiding !== false &&
								column.id !== "actions",
						)
						.map((column) => {
							const meta = column.columnDef.meta as
								| { headerLabel?: string }
								| undefined;
							return (
								<div
									key={column.id}
									className="flex items-center gap-2 text-sm"
								>
									<Checkbox
										id={`sales-finance-${column.id}`}
										checked={column.getIsVisible()}
										onCheckedChange={(checked) =>
											column.toggleVisibility(checked === true)
										}
									/>
									<label htmlFor={`sales-finance-${column.id}`}>
										{meta?.headerLabel ||
											column.columnDef.header?.toString() ||
											column.id}
									</label>
								</div>
							);
						})}
				</div>
			</PopoverContent>
		</Popover>
	);
}
