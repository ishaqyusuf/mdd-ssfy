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
import type { TableId } from "@/utils/table-settings";
import {
	SortableContext,
	horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@gnd/ui/button";
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
const TABLE_ID = "sales-production" satisfies TableId;
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
	createSortQuery: (field: string, defaultDirection?: "asc" | "desc") => void,
	table: Table<TData>,
	tableScroll?: TableScrollState,
) {
	const meta = header.column.columnDef.meta as TableColumnMeta | undefined;
	const label = getHeaderLabel(header);
	const sortField = meta?.sortField;
	const isSorted = sortField ? sortColumn === sortField : false;
	const sortDirection = isSorted ? sortValue : undefined;

	if (header.isPlaceholder) return null;

	if (columnId === "actions") {
		return (
			<div className="flex w-full items-center justify-end">
				{tableScroll ? (
					<HorizontalPagination
						canScrollLeft={tableScroll.canScrollLeft}
						canScrollRight={tableScroll.canScrollRight}
						onScrollLeft={tableScroll.scrollLeft}
						onScrollRight={tableScroll.scrollRight}
					/>
				) : null}
			</div>
		);
	}

	if (!sortField) {
		return (
			<span className={cn("truncate", HEADER_TEXT_CLASS)} title={label}>
				{label}
			</span>
		);
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className={cn(
				"h-7 min-w-0 justify-start gap-1 px-0 hover:bg-transparent",
				HEADER_TEXT_CLASS,
				isSorted && "text-foreground",
			)}
			onClick={() => createSortQuery(sortField)}
		>
			<span className="truncate" title={label}>
				{label}
			</span>
			{sortDirection === "asc" ? (
				<ArrowUp className="size-3.5 shrink-0" />
			) : sortDirection === "desc" ? (
				<ArrowDown className="size-3.5 shrink-0" />
			) : null}
		</Button>
	);
}
