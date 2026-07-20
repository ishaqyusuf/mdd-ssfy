"use client";

import {
	type TableColumnMeta,
	getTableColumnSizeStyle,
} from "@/components/tables-2/core";
import { cn } from "@gnd/ui/cn";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import {
	type ColumnDef,
	type RowData,
	type TableOptions,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";

type LegacyFormDataTableProps<TData extends RowData> = {
	columns: ColumnDef<TData>[];
	data: TData[];
	getRowId?: TableOptions<TData>["getRowId"];
	meta?: TableOptions<TData>["meta"];
	columnVisibility?: Record<string, boolean>;
	className?: string;
	onRowClick?: (row: TData) => void;
};

/**
 * Compatibility table for the established desktop sales-form editors.
 *
 * These grids are form controls, not persisted/list-page data tables. Keep them
 * on normal semantic table layout so global table-core behavior does not change
 * their density, scrolling, column order, or input alignment.
 */
export function LegacyFormDataTable<TData extends RowData>({
	columns,
	data,
	getRowId,
	meta,
	columnVisibility,
	className,
	onRowClick,
}: LegacyFormDataTableProps<TData>) {
	const table = useReactTable({
		columns,
		data,
		getCoreRowModel: getCoreRowModel(),
		getRowId,
		meta,
		state: {
			columnVisibility,
		},
	});

	return (
		<div className="w-full overflow-x-auto">
			<Table className={cn("table-fixed p-4 text-xs font-medium", className)}>
				<TableHeader className="text-xs">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow
							key={headerGroup.id}
							className="uppercase hover:bg-transparent"
						>
							{headerGroup.headers.map((header) => (
								<TableHead
									key={header.id}
									style={getLegacyColumnStyle(header.column)}
								>
									<div
										className={getLegacyHeaderAlignment(
											header.column.columnDef.meta as
												| TableColumnMeta
												| undefined,
										)}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</div>
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.map((row) => (
						<TableRow
							key={row.id}
							className={cn(
								"hover:bg-transparent",
								onRowClick && "cursor-pointer",
							)}
							onClick={() => onRowClick?.(row.original)}
						>
							{row.getVisibleCells().map((cell) => (
								<TableCell
									key={cell.id}
									style={getLegacyColumnStyle(cell.column)}
								>
									<div
										className={
											(
												cell.column.columnDef.meta as
													| TableColumnMeta
													| undefined
											)?.contentClassName
										}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</div>
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function getLegacyColumnStyle(column: {
	getSize: () => number;
	columnDef: { minSize?: number; maxSize?: number };
}) {
	const size = column.getSize();
	const minSize = column.columnDef.minSize ?? size;
	const maxSize = column.columnDef.maxSize ?? size;

	return {
		...getTableColumnSizeStyle({ size, minSize, maxSize }),
		width: size,
		minWidth: minSize,
		maxWidth: maxSize,
	};
}

function getLegacyHeaderAlignment(meta?: TableColumnMeta) {
	const classes = `${meta?.className ?? ""} ${meta?.contentClassName ?? ""}`;

	if (classes.includes("justify-end") || classes.includes("text-right")) {
		return "text-right";
	}
	if (classes.includes("justify-center") || classes.includes("text-center")) {
		return "text-center";
	}

	return undefined;
}
