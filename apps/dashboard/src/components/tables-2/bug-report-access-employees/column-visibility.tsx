"use client";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";

import { useBugReportAccessEmployeesTableStore } from "./store";

export function BugReportAccessEmployeesColumnVisibility() {
	const { columns, showColumnDividers, setShowColumnDividers } =
		useBugReportAccessEmployeesTableStore();

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="icon"
					aria-label="Bug report access employee columns"
				>
					<Icons.Tune size={18} />
				</Button>
			</PopoverTrigger>

			<PopoverContent className="w-[220px] p-0" align="end" sideOffset={8}>
				<div className="flex max-h-[450px] flex-col space-y-2 overflow-auto p-4">
					<div className="flex items-center space-x-2">
						<Checkbox
							id="bug-report-access-employees-column-dividers"
							checked={showColumnDividers}
							onCheckedChange={(checked) =>
								setShowColumnDividers(checked === true)
							}
						/>
						<label
							htmlFor="bug-report-access-employees-column-dividers"
							className="text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Column dividers
						</label>
					</div>
					<div className="my-1 border-t border-border" />
					{columns
						.filter(
							(column) =>
								column.columnDef.enableHiding !== false &&
								column.id !== "access",
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
										id={`bug-report-access-employees-${column.id}`}
										checked={column.getIsVisible()}
										onCheckedChange={(checked) =>
											column.toggleVisibility(checked === true)
										}
									/>
									<label
										htmlFor={`bug-report-access-employees-${column.id}`}
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
