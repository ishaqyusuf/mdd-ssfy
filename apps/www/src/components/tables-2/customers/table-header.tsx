"use client";

import { HorizontalPagination } from "@/components/horizontal-pagination";
import {
	ACTIONS_FULL_WIDTH_HEADER_CLASS,
	ACTIONS_STICKY_HEADER_CLASS,
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
const TABLE_ID = "customers" satisfies TableId;

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
						const isActions = columnId === "actions";

						if (!isVisible(columnId)) return null;

						const nextVisibleHeader = headers
							.slice(headerIndex + 1)
							.find((item) => isVisible(item.column.id));
						const showRightDivider =
							showColumnDividers &&
							Boolean(nextVisibleHeader) &&
							nextVisibleHeader?.column.id !== "actions";
						const hasNonStickyVisible = headers.some((item) => {
							if (item.column.id === "actions") return false;
							if (!isVisible(item.column.id)) return false;

							const itemMeta = item.column.columnDef.meta as
								| TableColumnMeta
								| undefined;

							return !(itemMeta?.sticky ?? false);
						});
						const actionsFullWidth = isActions && !hasNonStickyVisible;
						const isLastBeforeActions =
							headerIndex === headers.length - 2 &&
							headers[headers.length - 1]?.column.id === "actions";
						const shouldFlex =
							(isLastBeforeActions && !isSticky) || actionsFullWidth;
						const headerStyle = {
							...HEADER_CELL_BACKGROUND_STYLE,
							width: actionsFullWidth ? undefined : header.getSize(),
							minWidth: actionsFullWidth
								? undefined
								: isSticky
									? header.getSize()
									: header.column.columnDef.minSize,
							maxWidth: actionsFullWidth
								? undefined
								: isSticky
									? header.getSize()
									: header.column.columnDef.maxSize,
							...(!actionsFullWidth && getStickyStyle(columnId)),
							...(shouldFlex && { flex: 1 }),
						};
						const stickyClass = getStickyClassName(
							columnId,
							cn(
								"group/header relative h-full px-4 border-t border-border flex items-center",
								showRightDivider && "border-r",
							),
						);
						const finalClassName = isActions
							? actionsFullWidth
								? cn(
										ACTIONS_FULL_WIDTH_HEADER_CLASS,
										HEADER_BACKGROUND_CLASS,
										showRightDivider && "border-r",
									)
								: cn(
										ACTIONS_STICKY_HEADER_CLASS,
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
	sortColumn: string | null,
	sortValue: string | null,
	createSortQuery: (field: string) => void,
	tableScroll?: TableScrollState,
) {
	const meta = header.column.columnDef.meta as TableColumnMeta | undefined;
	const label = getHeaderLabel(header);
	const sortField = meta?.sortField ?? SORT_FIELD_MAPS[TABLE_ID][columnId];
	const isActiveSort = Boolean(sortField) && sortColumn === sortField;
	const sortDirection = isActiveSort ? sortValue : null;

	if (columnId === "customer") {
		return (
			<div className="flex w-full items-center justify-between gap-2">
				<SortableHeaderButton
					label={label}
					sortField={sortField}
					isActiveSort={isActiveSort}
					sortDirection={sortDirection}
					onSort={createSortQuery}
				/>
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

	return (
		<SortableHeaderButton
			label={label}
			sortField={sortField}
			isActiveSort={isActiveSort}
			sortDirection={sortDirection}
			onSort={createSortQuery}
		/>
	);
}

function SortableHeaderButton({
	label,
	sortField,
	isActiveSort,
	sortDirection,
	onSort,
}: {
	label: string;
	sortField?: string;
	isActiveSort: boolean;
	sortDirection: string | null;
	onSort: (field: string) => void;
}) {
	const content = (
		<span className="flex min-w-0 items-center gap-1">
			<span className="truncate">{label}</span>
			{isActiveSort ? (
				sortDirection === "asc" ? (
					<ArrowUp className="size-3 shrink-0" />
				) : (
					<ArrowDown className="size-3 shrink-0" />
				)
			) : null}
		</span>
	);

	if (!sortField) {
		return (
			<div className={cn(HEADER_TEXT_CLASS, "min-w-0 truncate")}>{content}</div>
		);
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className={cn(
				HEADER_TEXT_CLASS,
				"h-7 min-w-0 justify-start px-0 hover:bg-transparent hover:text-foreground",
				isActiveSort && "text-foreground",
			)}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				onSort(sortField);
			}}
		>
			{content}
		</Button>
	);
}
