"use client";

import { cn } from "@gnd/ui/cn";
import { TableCell, TableRow } from "@gnd/ui/table";
import type {
	Cell,
	ColumnOrderState,
	ColumnSizingState,
	Row,
	VisibilityState,
} from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { memo } from "react";
import type React from "react";
import type { CSSProperties } from "react";

import {
	getTableColumnLayoutStyle,
	resolveTableFillColumnId,
} from "./table-sizes";
import { getTableCellPaddingClass } from "./table-style";
import {
	ACTIONS_FULL_WIDTH_CELL_CLASS,
	type TableColumnMeta,
	type TableStyle,
} from "./types";

interface VirtualRowProps<TData> {
	row: Row<TData>;
	virtualStart: number;
	rowHeight: number;
	onCellClick?: (rowId: string, columnId: string) => void;
	getStickyStyle: (columnId: string) => CSSProperties;
	getStickyClassName: (columnId: string, baseClassName?: string) => string;
	nonClickableColumns?: Set<string>;
	columnSizing?: ColumnSizingState;
	columnOrder?: ColumnOrderState;
	columnVisibility?: VisibilityState;
	isSelected?: boolean;
	isExporting?: boolean;
	showColumnDividers?: boolean;
	tableStyle?: TableStyle;
	rowClassName?: (row: Row<TData>) => string;
	fillColumnId?: string | null;
}

function VirtualRowInner<TData>({
	row,
	virtualStart,
	rowHeight,
	onCellClick,
	getStickyStyle,
	getStickyClassName,
	nonClickableColumns = new Set(["select", "actions"]),
	isSelected = false,
	showColumnDividers = false,
	tableStyle = "default",
	rowClassName,
	fillColumnId,
}: VirtualRowProps<TData>) {
	const cells = row.getVisibleCells();
	const resolvedFillColumnId = resolveTableFillColumnId(
		cells.map((cell) => ({
			id: cell.column.id,
			canResize: cell.column.getCanResize(),
		})),
		fillColumnId,
	);

	return (
		<TableRow
			data-index={row.index}
			data-state={isSelected ? "selected" : undefined}
			className={cn(
				"group cursor-pointer select-text",
				"hover:bg-[#F2F1EF] hover:dark:bg-secondary",
				"data-[state=selected]:bg-muted/50",
				"flex items-center border-0",
				"absolute left-0 top-0 w-full min-w-full",
				rowClassName?.(row),
			)}
			style={{
				height: rowHeight,
				transform: `translateY(${virtualStart}px)`,
				contain: "layout style paint",
			}}
		>
			{cells.map((cell: Cell<TData, unknown>, cellIndex: number) => {
				const columnId = cell.column.id;
				const meta = cell.column.columnDef.meta as TableColumnMeta | undefined;
				const isSticky = meta?.sticky ?? false;
				const isActions = columnId === "actions";
				const isFillColumn = columnId === resolvedFillColumnId;
				const actionsFullWidth = isActions && !resolvedFillColumnId;
				const columnSize = cell.column.getSize();
				const minSize = cell.column.columnDef.minSize ?? columnSize;
				const maxSize = cell.column.columnDef.maxSize ?? columnSize;

				const cellStyle: CSSProperties = {
					...getTableColumnLayoutStyle({
						size: columnSize,
						minSize,
						maxSize,
						isFillColumn,
						actionsFullWidth,
					}),
					...(!actionsFullWidth && getStickyStyle(columnId)),
				};

				const cellClassName = actionsFullWidth
					? ACTIONS_FULL_WIDTH_CELL_CLASS
					: getStickyClassName(columnId, meta?.className);

				return (
					<TableCell
						key={cell.id}
						className={cn(
							"flex h-full items-center border-b border-border",
							getTableCellPaddingClass(tableStyle),
							showColumnDividers &&
								cells.length - 1 !== cellIndex &&
								"border-r",
							cellClassName,
							"group-data-[state=selected]:bg-muted/50",
							isActions && "justify-center",
						)}
						style={cellStyle}
						onClick={() => {
							if (!nonClickableColumns.has(columnId)) {
								onCellClick?.(row.id, columnId);
							}
						}}
					>
						<div
							className={cn(
								"w-full overflow-hidden truncate",
								meta?.contentClassName,
							)}
						>
							{flexRender(cell.column.columnDef.cell, cell.getContext())}
						</div>
					</TableCell>
				);
			})}
		</TableRow>
	);
}

function arePropsEqual<TData>(
	prevProps: VirtualRowProps<TData>,
	nextProps: VirtualRowProps<TData>,
): boolean {
	return (
		prevProps.row.id === nextProps.row.id &&
		prevProps.virtualStart === nextProps.virtualStart &&
		prevProps.rowHeight === nextProps.rowHeight &&
		prevProps.isSelected === nextProps.isSelected &&
		prevProps.isExporting === nextProps.isExporting &&
		prevProps.columnSizing === nextProps.columnSizing &&
		prevProps.columnOrder === nextProps.columnOrder &&
		prevProps.columnVisibility === nextProps.columnVisibility &&
		prevProps.showColumnDividers === nextProps.showColumnDividers &&
		prevProps.tableStyle === nextProps.tableStyle &&
		prevProps.fillColumnId === nextProps.fillColumnId &&
		prevProps.row.original === nextProps.row.original
	);
}

export const VirtualRow = memo(VirtualRowInner, arePropsEqual) as <TData>(
	props: VirtualRowProps<TData>,
) => React.ReactNode;
