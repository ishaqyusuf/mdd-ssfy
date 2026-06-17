"use client";

import { HorizontalPagination } from "@/components/horizontal-pagination";
import {
	type TableColumnMeta,
	type TableScrollState,
	getHeaderLabel,
} from "@/components/tables-2/core";
import { ResizeHandle } from "@/components/tables-2/resize-handle";
import { useSortQuery } from "@/hooks/use-sort-query";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { SORT_FIELD_MAPS, STICKY_COLUMNS } from "@/utils/table-configs";
import type { TableId } from "@/utils/table-settings";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { TableHead, TableHeader, TableRow } from "@gnd/ui/table";
import type { Header, Table } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";

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
const TABLE_ID = "unit-productions" satisfies TableId;

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
		stickyColumns: STICKY_COLUMNS[TABLE_ID],
	});

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
					className="flex h-[45px] min-w-full items-center !border-b-0 hover:bg-transparent"
				>
					{headerGroup.headers.map((header, headerIndex, headers) => {
						const columnId = header.column.id;
						const meta = header.column.columnDef.meta as
							| TableColumnMeta
							| undefined;
						const isSticky = meta?.sticky ?? false;

						if (!isVisible(columnId)) return null;

						const nextVisibleHeader = headers
							.slice(headerIndex + 1)
							.find((item) => isVisible(item.column.id));
						const showRightDivider =
							showColumnDividers && Boolean(nextVisibleHeader);
						const isLastVisible = !headers
							.slice(headerIndex + 1)
							.some((item) => isVisible(item.column.id));
						const shouldFlex = isLastVisible && !isSticky;
						const headerStyle = {
							...HEADER_CELL_BACKGROUND_STYLE,
							width: header.getSize(),
							minWidth: isSticky
								? header.getSize()
								: header.column.columnDef.minSize,
							maxWidth: isSticky
								? header.getSize()
								: header.column.columnDef.maxSize,
							...getStickyStyle(columnId),
							...(shouldFlex && { flex: 1 }),
						};
						const stickyClass = getStickyClassName(
							columnId,
							cn(
								"group/header relative h-full px-4 border-t border-border flex items-center",
								showRightDivider && "border-r",
							),
						);

						return (
							<TableHead
								key={header.id}
								className={cn(stickyClass, HEADER_BACKGROUND_CLASS, "z-10")}
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
					})}
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
	createSortQuery: (name: string) => void,
	table: Table<TData>,
	tableScroll?: TableScrollState,
) {
	const meta = header.column.columnDef.meta as TableColumnMeta | undefined;
	const label = meta?.headerLabel ?? getHeaderLabel(header.column.columnDef);
	const sortField = meta?.sortField ?? SORT_FIELD_MAPS[TABLE_ID][columnId];
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

	const content = sortField ? (
		<SortButton
			label={label}
			sortField={sortField}
			currentSortColumn={sortColumn}
			currentSortValue={sortValue}
			onSort={createSortQuery}
		/>
	) : (
		<span
			className={cn(
				HEADER_TEXT_CLASS,
				isRightAligned ? "block w-full truncate text-right" : "truncate",
			)}
		>
			{label}
		</span>
	);

	if (columnId !== "dueDate") {
		return (
			<div
				className={
					isRightAligned
						? "flex w-full justify-end overflow-hidden"
						: "w-full overflow-hidden"
				}
			>
				{content}
			</div>
		);
	}

	return (
		<div className="flex w-full items-center justify-between gap-2 overflow-hidden">
			{content}
			{tableScroll?.isScrollable ? (
				<HorizontalPagination
					canScrollLeft={tableScroll.canScrollLeft}
					canScrollRight={tableScroll.canScrollRight}
					onScrollLeft={tableScroll.scrollLeft}
					onScrollRight={tableScroll.scrollRight}
					className="hidden h-6 shrink-0 opacity-60 transition-opacity group-hover/header:opacity-100 md:flex"
				/>
			) : null}
		</div>
	);
}

function SortButton({
	label,
	sortField,
	currentSortColumn,
	currentSortValue,
	onSort,
}: {
	label: string;
	sortField: string;
	currentSortColumn?: string;
	currentSortValue?: string;
	onSort: (field: string) => void;
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
				onSort(sortField);
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
