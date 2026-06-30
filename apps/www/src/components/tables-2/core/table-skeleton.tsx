"use client";

import { cn } from "@gnd/ui/cn";
import { Skeleton } from "@gnd/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import type {
	ColumnDef,
	ColumnSizingState,
	VisibilityState,
} from "@tanstack/react-table";
import { type CSSProperties, useMemo } from "react";

import { SkeletonCell } from "./skeleton-cell";
import { getTableCellPaddingClass } from "./table-style";
import {
	type TableColumnMeta,
	type TableConfig,
	getColumnId,
	getHeaderLabel,
} from "./types";

interface TableSkeletonProps<TData> {
	columns: ColumnDef<TData>[];
	rowCount?: number;
	columnVisibility?: VisibilityState;
	columnSizing?: ColumnSizingState;
	columnOrder?: string[];
	stickyColumnIds?: string[];
	tableConfig?: TableConfig;
	actionsColumnId?: string;
	isEmpty?: boolean;
	className?: string;
}

const HEADER_BACKGROUND_CLASS = "!bg-sidebar-accent";
const HEADER_TEXT_CLASS =
	"text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-300";
const HEADER_CELL_BACKGROUND_STYLE = {
	backgroundColor:
		"color-mix(in oklab, var(--sidebar-accent) 88%, var(--foreground))",
};

export function TableSkeleton<TData>({
	columns,
	rowCount = 40,
	columnVisibility = {},
	columnSizing = {},
	columnOrder = [],
	stickyColumnIds = [],
	tableConfig,
	actionsColumnId = "actions",
	isEmpty = false,
	className,
}: TableSkeletonProps<TData>) {
	const headerHeight = tableConfig?.headerHeight ?? 45;
	const rowHeight = tableConfig?.rowHeight ?? 45;
	const tableStyle = tableConfig?.style ?? "default";
	const resolvedStickyColumnIds =
		tableConfig?.stickyColumns.map(({ id }) => id) ?? stickyColumnIds;
	const rows = useMemo(
		() => [...Array(rowCount)].map((_, i) => ({ id: i.toString() })),
		[rowCount],
	);

	const orderedColumns = useMemo(() => {
		if (columnOrder.length === 0) return columns;

		const ordered = columnOrder
			.map((id) => columns.find((column) => getColumnId(column) === id))
			.filter(Boolean) as typeof columns;
		const orderedIds = new Set(columnOrder);
		const remaining = columns.filter(
			(column) => !orderedIds.has(getColumnId(column)),
		);

		return [...ordered, ...remaining];
	}, [columns, columnOrder]);

	const visibleColumns = useMemo(() => {
		return orderedColumns.filter((column) => {
			const id = getColumnId(column);
			if (id === "select" || id === actionsColumnId) return true;
			return columnVisibility[id] !== false;
		});
	}, [orderedColumns, columnVisibility, actionsColumnId]);

	const stickyPositions = useMemo(() => {
		let position = 0;
		const positions: Record<string, number> = {};

		for (const column of visibleColumns) {
			const columnId = getColumnId(column);
			if (!resolvedStickyColumnIds.includes(columnId)) continue;

			const width = columnSizing[columnId] ?? column.size ?? 150;
			positions[columnId] = position;
			position += width;
		}

		return positions;
	}, [columnSizing, resolvedStickyColumnIds, visibleColumns]);

	const getStickyStyle = (columnId: string) => {
		const position = stickyPositions[columnId];
		return position !== undefined
			? ({ "--stick-left": `${position}px` } as CSSProperties)
			: {};
	};

	const getStickyClassName = (columnId: string, baseClassName?: string) => {
		const isSticky = resolvedStickyColumnIds.includes(columnId);
		return cn(
			baseClassName,
			isSticky && "md:sticky md:left-[var(--stick-left)]",
		);
	};

	return (
		<div className={cn("w-full", className)}>
			<div
				className={cn(
					"overflow-auto overscroll-x-none scrollbar-hide",
					!isEmpty && "md:border-l md:border-r md:border-b md:border-border",
				)}
			>
				<Table
					className={cn(isEmpty && "pointer-events-none opacity-20 blur-[7px]")}
				>
					<TableHeader
						className={cn(
							"sticky top-0 z-20 block border-0",
							HEADER_BACKGROUND_CLASS,
						)}
					>
						<TableRow
							className="flex items-center !border-b-0 hover:bg-transparent"
							style={{ height: headerHeight }}
						>
							{visibleColumns.map((column) => {
								const columnId = getColumnId(column);
								const meta = column.meta as TableColumnMeta | undefined;
								const sticky = resolvedStickyColumnIds.includes(columnId);
								const isActions = columnId === actionsColumnId;
								const isStatus = columnId === "status";
								const width = columnSizing[columnId] ?? column.size ?? 150;
								const minWidth = sticky ? width : (column.minSize ?? width);
								const maxWidth = sticky ? width : (column.maxSize ?? width);
								const stickyClass = getStickyClassName(
									columnId,
									cn(
										"group/header relative h-full border-t border-border flex items-center",
										getTableCellPaddingClass(tableStyle),
									),
								);
								const headerClassName = isActions
									? cn(
											"group/header relative h-full border-t border-border flex items-center justify-center md:sticky md:right-0 z-10",
											getTableCellPaddingClass(tableStyle),
											HEADER_BACKGROUND_CLASS,
										)
									: sticky
										? cn(stickyClass, HEADER_BACKGROUND_CLASS, "z-10")
										: cn(stickyClass, HEADER_BACKGROUND_CLASS);

								return (
									<TableHead
										key={columnId}
										className={headerClassName}
										style={{
											...HEADER_CELL_BACKGROUND_STYLE,
											width,
											minWidth,
											maxWidth,
											...getStickyStyle(columnId),
											...(!isActions &&
												!isStatus && {
													borderRight: "1px solid hsl(var(--border))",
												}),
											...(isActions && {
												borderLeft: "1px solid hsl(var(--border))",
												borderTop: "1px solid hsl(var(--border))",
											}),
										}}
									>
										{columnId === "select" ? (
											<Skeleton className="h-4 w-4" />
										) : (
											<span className={HEADER_TEXT_CLASS}>
												{getHeaderLabel(column)}
											</span>
										)}
									</TableHead>
								);
							})}
						</TableRow>
					</TableHeader>

					<TableBody className="border-l-0 border-r-0">
						{rows.map((row) => (
							<TableRow
								key={row.id}
								className="group flex items-center border-b border-border"
								style={{ height: rowHeight }}
							>
								{visibleColumns.map((column) => {
									const columnId = getColumnId(column);
									const meta = column.meta as TableColumnMeta | undefined;
									const sticky = resolvedStickyColumnIds.includes(columnId);
									const isActions = columnId === actionsColumnId;
									const width = columnSizing[columnId] ?? column.size ?? 150;
									const minWidth = sticky ? width : (column.minSize ?? width);
									const maxWidth = sticky ? width : (column.maxSize ?? width);
									const cellClassName = cn(
										"flex h-full items-center",
										getTableCellPaddingClass(tableStyle),
										getStickyClassName(columnId, meta?.className),
										isActions &&
											"md:sticky md:right-0 bg-background z-10 justify-center",
									);

									return (
										<TableCell
											key={columnId}
											className={cellClassName}
											style={{
												width,
												minWidth,
												maxWidth,
												...getStickyStyle(columnId),
												...(isActions && {
													borderLeft: "1px solid hsl(var(--border))",
													borderBottom: "1px solid hsl(var(--border))",
												}),
											}}
										>
											{meta?.skeleton ? (
												<SkeletonCell
													type={meta.skeleton.type}
													width={meta.skeleton.width}
												/>
											) : (
												<Skeleton className="h-3.5 w-24" />
											)}
										</TableCell>
									);
								})}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
