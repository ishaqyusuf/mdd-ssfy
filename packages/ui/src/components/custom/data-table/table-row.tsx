"use client";

import { flexRender } from "@tanstack/react-table";

import { useTable } from ".";
import { useStickyColumns } from "../../../hooks/use-sticky-columns";
import { cn } from "../../../utils";
import { Checkbox } from "../../checkbox";
import { TableRow as BaseTableRow, TableCell } from "../../table";

type CellMeta = {
	className?: string;
	preventDefault?: boolean;
};

export function TableRow() {
	const { table, tableMeta, mobileMode } = useTable();
	const { getStickyStyle } = useStickyColumns({
		table,
		loading: false,
	});
	return (
		<>
			{table.getRowModel().rows.map((row) => (
				<BaseTableRow
					className={cn(
						"group h-[40px] md:h-[45px] cursor-pointer select-text hover:bg-[#F2F1EF] hover:dark:bg-secondary",
						mobileMode?.borderless && "border-b-0",
						tableMeta?.rowClassName,
					)}
					key={row.id}
				>
					{/* <CheckboxRow style={getStickyStyle('checkbox')} row={row} /> */}
					{row.getVisibleCells().map((cell) => (
						<TableCell
							key={cell.id}
							style={getStickyStyle(cell.column.id)}
							onClick={() => {
								const meta = cell.column.columnDef.meta as CellMeta | undefined;
								if (
									cell.column.id === "actions" ||
									cell.column.id === "select" ||
									meta?.preventDefault
								)
									return;
								tableMeta?.rowClick?.(row.original?.id, row.original);
							}}
							className={cn(
								(cell.column.columnDef.meta as CellMeta | undefined)?.className,
								tableMeta?.rowClick && "cursor-pointer hover:bg-transparent",
								mobileMode?.borderless && "border-0",
								"",
							)}
						>
							{flexRender(cell.column.columnDef.cell, cell.getContext())}
						</TableCell>
					))}
				</BaseTableRow>
			))}
		</>
	);
}
function CheckboxRow({ row }) {
	const ctx = useTable();
	const { table } = ctx;
	if (!ctx.checkbox) return null;
	return (
		<TableCell align="center" className="py-0">
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => {
					const val = !!value;

					row.toggleSelected(val);
				}}
				aria-label="Select row"
				className="translate-y-[2px]"
			/>
		</TableCell>
	);
}
