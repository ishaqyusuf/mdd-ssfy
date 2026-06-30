"use client";

import { HorizontalPagination } from "@/components/horizontal-pagination";
import {
	type TableColumnMeta,
	type TableScrollState,
	getHeaderLabel,
	getTableCellPaddingClass,
} from "@/components/tables-2/core";
import { ResizeHandle } from "@/components/tables-2/resize-handle";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import type { TableId } from "@/utils/table-settings";
import { cn } from "@gnd/ui/cn";
import { TableHead, TableHeader, TableRow } from "@gnd/ui/table";
import type { Header, Table } from "@tanstack/react-table";

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
const TABLE_ID = "inventory-categories" satisfies TableId;
const tableConfig = TABLE_CONFIGS[TABLE_ID];

export function DataTableHeader<TData>({
	table,
	loading,
	tableScroll,
	showColumnDividers = false,
}: Props<TData>) {
	const { getStickyStyle, getStickyClassName, isVisible } = useStickyColumns({
		table,
		loading,
		stickyColumns: tableConfig.stickyColumns,
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
					className="flex min-w-full items-center !border-b-0 hover:bg-transparent"
					style={{ height: tableConfig.headerHeight }}
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
								"group/header relative h-full border-t border-border flex items-center",
								getTableCellPaddingClass(tableConfig.style),
								showRightDivider && "border-r",
								columnId === "select" && "justify-center",
							),
						);

						return (
							<TableHead
								key={header.id}
								className={cn(stickyClass, HEADER_BACKGROUND_CLASS, "z-10")}
								style={headerStyle}
							>
								{renderHeaderContent(header, columnId, tableScroll)}
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
	tableScroll?: TableScrollState,
) {
	const meta = header.column.columnDef.meta as TableColumnMeta | undefined;
	const label = meta?.headerLabel ?? getHeaderLabel(header.column.columnDef);
	const isRightAligned = meta?.className?.split(/\s+/).includes("text-right");
	const content = (
		<span
			className={cn(
				HEADER_TEXT_CLASS,
				isRightAligned ? "block w-full truncate text-right" : "truncate",
			)}
		>
			{label}
		</span>
	);

	if (columnId !== "category") {
		return content;
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
