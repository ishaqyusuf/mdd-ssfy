"use client";

import { TableGrid, VirtualRow } from "@/components/tables-2/core";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useProductReportFilters } from "@/hooks/use-product-report-filter-params";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { openLink } from "@/lib/open-link";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Badge } from "@gnd/ui/badge";
import { FormatAmount } from "@gnd/ui/custom/format-amount";
import { Table, TableBody } from "@gnd/ui/table";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
	type Row,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef } from "react";

import {
	type SalesStatistic,
	columns,
	getSalesStatisticRowId,
	resolveProductImageSrc,
} from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useSalesStatisticsTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set<string>();
const COLUMN_IDS = getColumnIds(columns);
const TABLE_ID = "sales-statistics";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type ProductReportInput = RouterInputs["sales"]["getProductReport"];
type ProductReportPage = {
	data?: SalesStatistic[];
	meta?: {
		cursor?: string | number | null;
	};
};

type Props = {
	initialSettings?: Partial<TableSettings>;
	defaultFilters?: ProductReportInput;
	singlePage?: boolean;
};

function getMargin(item: SalesStatistic) {
	const salesPrice = Number(item.salesPrice || 0);
	const costPrice = Number(item.costPrice || 0);

	return salesPrice > 0 ? ((salesPrice - costPrice) / salesPrice) * 100 : 0;
}

function ProductGridCard({
	row,
	onOpen,
}: {
	row: Row<SalesStatistic>;
	onOpen: (rowId: string) => void;
}) {
	const item = row.original;
	const title = item.name || "-";
	const imageSrc = resolveProductImageSrc(item.img);
	const margin = getMargin(item);

	return (
		<button
			type="button"
			className="group flex min-h-[236px] w-full flex-col overflow-hidden rounded-md border border-border bg-background text-left shadow-sm transition hover:border-foreground/20 hover:bg-[#F2F1EF] hover:shadow-md hover:dark:bg-secondary"
			onClick={() => onOpen(row.id)}
		>
			<div className="relative h-28 w-full overflow-hidden border-b bg-muted">
				{imageSrc ? (
					<img
						src={imageSrc}
						alt={title}
						className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center text-3xl font-semibold uppercase text-muted-foreground">
						{title.slice(0, 1)}
					</div>
				)}
			</div>
			<div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
				<div className="min-w-0 space-y-1">
					<div className="line-clamp-2 text-sm font-semibold uppercase leading-snug">
						{title}
					</div>
					<div className="flex min-h-5 items-center gap-2">
						{item.productCode ? (
							<span className="truncate font-mono text-[11px] text-muted-foreground">
								{item.productCode}
							</span>
						) : null}
						{item.category ? (
							<Badge variant="secondary" className="max-w-[55%] truncate">
								{item.category}
							</Badge>
						) : null}
					</div>
				</div>

				<div className="mt-auto grid grid-cols-2 gap-2 text-xs">
					<div className="rounded-md border bg-background/70 p-2">
						<div className="text-muted-foreground">Units</div>
						<div className="font-mono text-sm font-semibold">
							{item.units ?? 0}
						</div>
					</div>
					<div className="rounded-md border bg-background/70 p-2">
						<div className="text-muted-foreground">Revenue</div>
						<div className="font-mono text-sm font-semibold">
							<FormatAmount
								amount={item.revenue ?? 0}
								maximumFractionDigits={0}
							/>
						</div>
					</div>
					<div className="rounded-md border bg-background/70 p-2">
						<div className="text-muted-foreground">Sales</div>
						<div className="font-mono text-sm font-semibold">
							<FormatAmount
								amount={item.salesPrice ?? 0}
								maximumFractionDigits={0}
							/>
						</div>
					</div>
					<div className="rounded-md border bg-background/70 p-2">
						<div className="text-muted-foreground">Margin</div>
						<div
							className={cn(
								"font-mono text-sm font-semibold",
								margin >= 25
									? "text-emerald-700"
									: margin > 0
										? "text-amber-700"
										: "text-muted-foreground",
							)}
						>
							{margin.toFixed(1)}%
						</div>
					</div>
				</div>
			</div>
		</button>
	);
}

export function DataTable({
	initialSettings,
	defaultFilters,
	singlePage,
}: Props) {
	const trpc = useTRPC();
	const { filters, hasFilters } = useProductReportFilters();
	const parentRef = useRef<HTMLDivElement>(null);
	const setColumns = useSalesStatisticsTableStore((state) => state.setColumns);
	const bindShowColumnDividers = useSalesStatisticsTableStore(
		(state) => state.bindShowColumnDividers,
	);
	const bindViewMode = useSalesStatisticsTableStore(
		(state) => state.bindViewMode,
	);

	useScrollHeader(parentRef);

	const {
		columnVisibility,
		setColumnVisibility,
		columnSizing,
		setColumnSizing,
		columnOrder,
		setColumnOrder,
		showColumnDividers,
		setShowColumnDividers,
		viewMode,
		setViewMode,
	} = useTableSettings({
		tableId: "sales-statistics",
		initialSettings,
		columnIds: COLUMN_IDS,
		showColumnDividers: true,
	});

	const queryInput = {
		...filters,
		...(defaultFilters || {}),
	} as ProductReportInput;

	const infiniteQueryOptions = trpc.sales.getProductReport.infiniteQueryOptions(
		queryInput,
		{
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		},
	);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<ProductReportPage>(infiniteQueryOptions as never);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	const table = useReactTable({
		data: tableData,
		getRowId: getSalesStatisticRowId,
		columns,
		getCoreRowModel: getCoreRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		enableColumnResizing: true,
		columnResizeMode: "onChange",
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		state: {
			columnVisibility,
			columnSizing,
			columnOrder,
		},
	});

	const { getStickyStyle, getStickyClassName } = useStickyColumns({
		columnVisibility,
		table,
		stickyColumns: tableConfig.stickyColumns,
	});
	const { sensors, handleDragEnd } = useTableDnd(table);
	const tableScroll = useTableScroll({
		useColumnWidths: true,
		startFromColumn: 1,
	});
	const rows = table.getRowModel().rows;
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => tableConfig.rowHeight,
		overscan: 10,
	});

	useEffect(() => {
		setColumns(table.getAllLeafColumns());
	}, [setColumns, table]);

	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, showColumnDividers, setShowColumnDividers]);

	useEffect(() => {
		bindViewMode(viewMode, setViewMode);
	}, [bindViewMode, viewMode, setViewMode]);

	useInfiniteScroll<HTMLDivElement>({
		scrollRef: parentRef,
		rowVirtualizer,
		rowCount: rows.length,
		hasNextPage: viewMode === "table" && !singlePage ? hasNextPage : false,
		isFetchingNextPage,
		fetchNextPage,
	});

	useEffect(() => {
		const scrollElement = parentRef.current;
		if (!scrollElement || viewMode !== "grid") return;

		const checkLoadMore = () => {
			if (singlePage || isFetchingNextPage || !hasNextPage) return;

			const distanceFromBottom =
				scrollElement.scrollHeight -
				scrollElement.scrollTop -
				scrollElement.clientHeight;

			if (distanceFromBottom < 600) {
				fetchNextPage();
			}
		};

		checkLoadMore();
		scrollElement.addEventListener("scroll", checkLoadMore, {
			passive: true,
		});

		return () => scrollElement.removeEventListener("scroll", checkLoadMore);
	}, [fetchNextPage, hasNextPage, isFetchingNextPage, singlePage, viewMode]);

	const handleCellClick = useCallback((rowId: string) => {
		const productId = Number(rowId);

		if (!Number.isFinite(productId)) return;

		openLink(`/sales-book/top-selling-products/${productId}`, {});
	}, []);

	if (hasFilters && tableData.length === 0) {
		return <NoResults />;
	}

	if (tableData.length === 0) {
		return <EmptyState />;
	}

	const virtualItems = rowVirtualizer.getVirtualItems();

	return (
		<div className="relative">
			{viewMode === "grid" ? (
				<TableGrid
					rows={rows}
					scrollRef={parentRef}
					isFetchingNextPage={isFetchingNextPage}
					renderItem={(row) => (
						<ProductGridCard key={row.id} row={row} onOpen={handleCellClick} />
					)}
				/>
			) : (
				<div className="w-full">
					<div
						ref={(element) => {
							parentRef.current = element;
							tableScroll.containerRef.current = element;
						}}
						className="overflow-auto overscroll-contain border-b border-l border-r border-border scrollbar-hide"
						style={{
							height: "calc(100vh - 240px + var(--header-offset, 0px))",
						}}
					>
						<DndContext
							id="sales-statistics-table-dnd"
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={handleDragEnd}
						>
							<Table className="w-full min-w-full">
								<DataTableHeader
									table={table}
									tableScroll={tableScroll}
									showColumnDividers={showColumnDividers}
								/>

								<TableBody
									className="block border-l-0 border-r-0"
									style={{
										height: `${rowVirtualizer.getTotalSize()}px`,
										position: "relative",
									}}
								>
									{virtualItems.map((virtualRow: VirtualItem) => {
										const row = rows[virtualRow.index];
										if (!row) return null;

										return (
											<VirtualRow
												key={row.id}
												row={row}
												virtualStart={virtualRow.start}
												rowHeight={tableConfig.rowHeight}
												tableStyle={tableConfig.style}
												getStickyStyle={getStickyStyle}
												getStickyClassName={getStickyClassName}
												nonClickableColumns={NON_CLICKABLE_COLUMNS}
												onCellClick={handleCellClick}
												columnSizing={columnSizing}
												columnOrder={columnOrder}
												columnVisibility={columnVisibility}
												showColumnDividers={showColumnDividers}
											/>
										);
									})}
								</TableBody>
							</Table>
						</DndContext>
						<div
							style={{
								height: "var(--header-offset, 0px)",
								flexShrink: 0,
							}}
							aria-hidden
						/>
					</div>
				</div>
			)}
		</div>
	);
}
