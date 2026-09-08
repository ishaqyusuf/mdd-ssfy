"use client";

import type { RowPresentation } from "@/lib/table-row-activity/compose";
import { Icons } from "@gnd/ui/icons";
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
	activity?: RowPresentation;
	activityLabelColumnId?: string;
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
	activity,
	activityLabelColumnId,
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
	const ActivityIcon =
		activity?.phase === "processing"
			? Icons.spinner
			: activity?.phase === "success"
				? Icons.check
				: Icons.AlertCircle;
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
			onClickCapture={(event) => {
				if (activity?.interactionDisabled) {
					event.preventDefault();
					event.stopPropagation();
				}
			}}
			onKeyDownCapture={(event) => {
				if (
					activity?.interactionDisabled &&
					(event.key === "Enter" || event.key === " ")
				) {
					event.preventDefault();
					event.stopPropagation();
				}
			}}
			data-row-key={row.id}
			data-row-activity={activity?.phase}
			aria-busy={activity?.phase === "processing" || undefined}
			aria-disabled={activity?.interactionDisabled || undefined}
			aria-label={activity?.label}
			inert={activity?.interactionDisabled || undefined}
			data-index={row.index}
			data-state={isSelected ? "selected" : undefined}
			className={cn(
				"group cursor-pointer select-text",
				activity?.retained &&
					"transition-opacity duration-[225ms] motion-reduce:transition-none",
				"hover:bg-[#F2F1EF] hover:dark:bg-secondary",
				"data-[state=selected]:bg-muted/50",
				"flex items-center border-0",
				"absolute left-0 top-0 w-full min-w-full",
				rowClassName?.(row),
			)}
			style={{
				opacity: activity?.exiting ? 0 : 1,
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
							activity?.phase === "processing" &&
								"!bg-amber-100 dark:!bg-amber-950",
							activity?.phase === "success" &&
								"!bg-emerald-100 dark:!bg-emerald-950",
							activity?.phase === "error" && "!bg-red-100 dark:!bg-red-950",
							activity?.phase === "review-required" &&
								"!bg-amber-50 dark:!bg-amber-950",
							(activity?.phase === "unknown" ||
								activity?.phase === "canceled") &&
								"!bg-muted",
						)}
						style={cellStyle}
						onClick={() => {
							if (
								!activity?.interactionDisabled &&
								!nonClickableColumns.has(columnId)
							) {
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
							{activity && columnId === activityLabelColumnId ? (
								<span className="inline-flex items-center gap-1.5">
									<ActivityIcon
										aria-hidden="true"
										className={cn(
											"size-3.5 shrink-0",
											activity.phase === "processing" &&
												"animate-spin motion-reduce:animate-none",
										)}
									/>
									<span>{activity.label}</span>
								</span>
							) : (
								flexRender(cell.column.columnDef.cell, cell.getContext())
							)}
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
		prevProps.activityLabelColumnId === nextProps.activityLabelColumnId &&
		prevProps.activity === nextProps.activity &&
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
