"use client";

import { HorizontalPagination } from "@/components/horizontal-pagination";
import {
	ACTIONS_FULL_WIDTH_HEADER_CLASS,
	ACTIONS_STICKY_HEADER_CLASS,
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
const TABLE_ID = "sales-accounting" satisfies TableId;
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
	const label = getAccountingHeaderLabel(header);

	if (columnId === "createdAt") {
		return (
			<div className="flex w-full items-center justify-between gap-2">
				<HeaderLabel label={label} />
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

	return <HeaderLabel label={label} />;
}

function HeaderLabel({ label }: { label: string }) {
	return (
		<span className={cn("truncate text-left", HEADER_TEXT_CLASS)}>{label}</span>
	);
}

function getAccountingHeaderLabel<TData>(header: Header<TData, unknown>) {
	const meta = header.column.columnDef.meta as TableColumnMeta | undefined;

	if (typeof meta?.headerLabel === "string") return meta.headerLabel;

	return getHeaderLabel(header.column.columnDef);
}
