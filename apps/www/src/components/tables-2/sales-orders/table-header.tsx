"use client";

import { HorizontalPagination } from "@/components/horizontal-pagination";
import {
	ACTIONS_FULL_WIDTH_HEADER_CLASS,
	ACTIONS_STICKY_HEADER_CLASS,
	type TableColumnMeta,
	type TableScrollState,
	getHeaderLabel,
	getTableCellPaddingClass,
	getTableHeaderLayoutStyle,
} from "@/components/tables-2/core";
import { DraggableHeader } from "@/components/tables-2/draggable-header";
import { ResizeHandle } from "@/components/tables-2/resize-handle";
import { useSortQuery } from "@/hooks/use-sort-query";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import {
	SortableContext,
	horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { TableHead, TableHeader, TableRow } from "@gnd/ui/table";
import type { Header, Table } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo } from "react";

interface Props<TData> {
	table?: Table<TData>;
	loading?: boolean;
	tableScroll?: TableScrollState;
	showColumnDividers?: boolean;
}
const HEADER_BACKGROUND_CLASS = "!bg-sidebar-accent";
const HEADER_TEXT_CLASS =
	"text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-300";
const HEADER_CELL_BACKGROUND_STYLE = {
	backgroundColor:
		"color-mix(in oklab, var(--sidebar-accent) 88%, var(--foreground))",
};
const TABLE_ID = "sales-orders";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

export function DataTableHeader<TData>({
	table,
	loading,
	tableScroll,
	showColumnDividers = false,
}: Props<TData>) {
	const { sortColumn, sortValue, createSortQuery } = useSortQuery();
	const { getStickyStyle, getStickyClassName, isVisible } = useStickyColumns({
		table,
		loading,
		stickyColumns: tableConfig.stickyColumns,
	});
	const sortableColumnIds = useMemo(() => {
		if (!table) return [];

		return table
			.getAllLeafColumns()
			.filter((column) => !tableConfig.nonReorderableColumns.has(column.id))
			.map((column) => column.id);
	}, [table]);

	if (!table) return null;

	return (
		<TableHeader
			className={cn(
				"sticky top-0 z-20 block w-full border-0",
				HEADER_BACKGROUND_CLASS,
			)}
		>
			{table.getHeaderGroups().map((headerGroup) => (
				<TableRow
					key={headerGroup.id}
					className="flex min-w-full items-center !border-b-0 hover:bg-transparent"
					style={{ height: tableConfig.headerHeight }}
				>
					<SortableContext
						items={sortableColumnIds}
						strategy={horizontalListSortingStrategy}
					>
						{headerGroup.headers.map((header, headerIndex, headers) => {
							const columnId = header.column.id;
							const meta = header.column.columnDef.meta as
								| TableColumnMeta
								| undefined;
							const isSticky = meta?.sticky ?? false;
							const isActions = columnId === "actions";
							const canReorder =
								!tableConfig.nonReorderableColumns.has(columnId);

							if (!isVisible(columnId)) return null;

							const nextVisibleHeader = headers
								.slice(headerIndex + 1)
								.find((item) => isVisible(item.column.id));
							const showRightDivider =
								showColumnDividers &&
								Boolean(nextVisibleHeader) &&
								nextVisibleHeader?.column.id !== "actions";

							const { actionsFullWidth, style: columnLayoutStyle } =
								getTableHeaderLayoutStyle({
									headers,
									header,
									isVisible,
									preferredFillColumnId: tableConfig.fillColumnId,
									isSticky,
								});
							const headerStyle = {
								...HEADER_CELL_BACKGROUND_STYLE,
								...columnLayoutStyle,
								...(!actionsFullWidth && getStickyStyle(columnId)),
							};

							if (!canReorder) {
								const stickyClass = getStickyClassName(
									columnId,
									cn(
										"group/header relative h-full border-t border-border flex items-center",
										getTableCellPaddingClass(tableConfig.style),
										showRightDivider && "border-r",
										columnId === "select" && "justify-center",
									),
								);
								const finalClassName = isActions
									? actionsFullWidth
										? cn(
												ACTIONS_FULL_WIDTH_HEADER_CLASS,
												getTableCellPaddingClass(tableConfig.style),
												HEADER_BACKGROUND_CLASS,
												showRightDivider && "border-r",
											)
										: cn(
												ACTIONS_STICKY_HEADER_CLASS,
												getTableCellPaddingClass(tableConfig.style),
												HEADER_BACKGROUND_CLASS,
												showRightDivider && "border-r",
											)
									: cn(stickyClass, HEADER_BACKGROUND_CLASS, "z-10");

								return (
									<TableHead
										key={header.id}
										className={finalClassName}
										style={headerStyle}
									>
										{renderHeaderContent(
											header,
											columnId,
											sortColumn,
											sortValue,
											createSortQuery,
											table,
											tableScroll,
										)}
										<ResizeHandle header={header} />
									</TableHead>
								);
							}

							return (
								<DraggableHeader
									key={header.id}
									id={columnId}
									style={headerStyle}
									className={cn(
										HEADER_BACKGROUND_CLASS,
										showRightDivider && "border-r",
									)}
									tableStyle={tableConfig.style}
								>
									<div className="flex min-w-0 flex-1 items-center overflow-hidden">
										{renderHeaderContent(
											header,
											columnId,
											sortColumn,
											sortValue,
											createSortQuery,
											table,
											tableScroll,
										)}
									</div>
									<ResizeHandle header={header} />
								</DraggableHeader>
							);
						})}
					</SortableContext>
				</TableRow>
			))}
		</TableHeader>
	);
}
function renderHeaderContent<TData>(
	header: Header<TData, unknown>,
	columnId: string,
	sortColumn: string | undefined,
	sortValue: string | undefined,
	createSortQuery: (name: string, defaultDirection?: "asc" | "desc") => void,
	table: Table<TData>,
	tableScroll?: TableScrollState,
) {
	const meta = header.column.columnDef.meta as TableColumnMeta | undefined;
	const sortField = meta?.sortField ?? tableConfig.sortFieldMap[columnId];
	const isRightAligned = meta?.className?.split(/\s+/).includes("text-right");

	if (columnId === "select") {
		return (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected()
						? true
						: table.getIsSomePageRowsSelected()
							? "indeterminate"
							: false
				}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
			/>
		);
	}

	if (columnId === "actions") {
		return (
			<span className={cn("w-full text-center", HEADER_TEXT_CLASS)}>
				Actions
			</span>
		);
	}

	if (columnId === "orderId") {
		return (
			<div className="flex w-full items-center justify-between overflow-hidden">
				<SortButton
					label={meta?.headerLabel ?? getHeaderLabel(header.column.columnDef)}
					sortField={sortField ?? "orderId"}
					currentSortColumn={sortColumn}
					currentSortValue={sortValue}
					onSort={createSortQuery}
					defaultSortDirection={meta?.defaultSortDirection}
				/>
				{tableScroll?.isScrollable && (
					<HorizontalPagination
						canScrollLeft={tableScroll.canScrollLeft}
						canScrollRight={tableScroll.canScrollRight}
						onScrollLeft={tableScroll.scrollLeft}
						onScrollRight={tableScroll.scrollRight}
						className="hidden shrink-0 md:flex"
					/>
				)}
			</div>
		);
	}

	if (sortField) {
		return (
			<div
				className={
					isRightAligned
						? "flex w-full justify-end overflow-hidden"
						: "w-full overflow-hidden"
				}
			>
				<SortButton
					label={meta?.headerLabel ?? getHeaderLabel(header.column.columnDef)}
					sortField={sortField}
					currentSortColumn={sortColumn}
					currentSortValue={sortValue}
					onSort={createSortQuery}
					defaultSortDirection={meta?.defaultSortDirection}
				/>
			</div>
		);
	}

	return (
		<span
			className={cn(
				HEADER_TEXT_CLASS,
				isRightAligned ? "block w-full truncate text-right" : "truncate",
			)}
		>
			{meta?.headerLabel ?? getHeaderLabel(header.column.columnDef)}
		</span>
	);
}

function SortButton({
	label,
	sortField,
	currentSortColumn,
	currentSortValue,
	onSort,
	defaultSortDirection = "asc",
}: {
	label: string;
	sortField: string;
	currentSortColumn?: string;
	currentSortValue?: string;
	onSort: (field: string, defaultDirection?: "asc" | "desc") => void;
	defaultSortDirection?: "asc" | "desc";
}) {
	return (
		<Button
			className={cn(
				"min-w-0 max-w-full gap-2 p-0 hover:bg-transparent",
				HEADER_TEXT_CLASS,
				"hover:text-slate-900 dark:hover:text-slate-100",
			)}
			variant="ghost"
			onClick={(event) => {
				event.stopPropagation();
				onSort(sortField, defaultSortDirection);
			}}
		>
			<span className="truncate">{label}</span>
			{sortField === currentSortColumn && currentSortValue === "asc" && (
				<ArrowDown size={16} />
			)}
			{sortField === currentSortColumn && currentSortValue === "desc" && (
				<ArrowUp size={16} />
			)}
		</Button>
	);
}
