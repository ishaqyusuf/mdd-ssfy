"use client";

import { salesInboundRowClassName } from "@/components/sales-inbound-status-badge";
import { VirtualRow } from "@/components/tables-2/core";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useSortParams } from "@/hooks/use-sort-params";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useTRPC } from "@/trpc/client";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Table, TableBody } from "@gnd/ui/table";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { BottomBar } from "./bottom-bar";
import { columns } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set([
	"select",
	"inboundStatus",
	"invoiceTotal",
	"actions",
]);
const COLUMN_IDS = getColumnIds(columns);
const TABLE_ID = "sales-orders";
const tableConfig = TABLE_CONFIGS[TABLE_ID];
type SalesOrdersInput = RouterInputs["sales"]["getOrders"];

type Props = {
	initialSettings?: Partial<TableSettings>;
	defaultFilters?: SalesOrdersInput;
	bin?: boolean;
	singlePage?: boolean;
	embedded?: boolean;
};

export function DataTable({
	initialSettings,
	defaultFilters,
	bin,
	singlePage,
	embedded,
}: Props) {
	const trpc = useTRPC();
	const { params } = useSortParams();
	const { filters, hasFilters } = useSalesOrdersV2FilterParams();
	const overviewQuery = useSalesOverviewQuery();
	const parentRef = useRef<HTMLDivElement>(null);
	const { rowSelection, setRowSelection, setColumns, setSelectedSalesIds } =
		useSalesOrdersStore();
	const setIsTableScrolled = useSalesOrdersStore(
		(state) => state.setIsTableScrolled,
	);

	useScrollHeader(parentRef, {
		extraOffset: bin ? 0 : tableConfig.summaryGridHeight,
	});

	const {
		columnVisibility,
		setColumnVisibility,
		columnSizing,
		setColumnSizing,
		columnOrder,
		setColumnOrder,
		showColumnDividers,
		setShowColumnDividers,
	} = useTableSettings({
		tableId: "sales-orders",
		initialSettings,
		columnIds: COLUMN_IDS,
		showColumnDividers: true,
	});
	const bindShowColumnDividers = useSalesOrdersStore(
		(state) => state.bindShowColumnDividers,
	);
	const queryInput = {
		...filters,
		...(defaultFilters || {}),
		bin,
		sort: params.sort,
	} as SalesOrdersInput;

	const infiniteQueryOptions = trpc.sales.getOrders.infiniteQueryOptions(
		queryInput,
		{
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		},
	);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery(infiniteQueryOptions);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	useEffect(() => {
		const selectedIds = tableData.reduce<number[]>((ids, order) => {
			if (rowSelection[order.uuid]) {
				ids.push(order.id);
			}

			return ids;
		}, []);

		setSelectedSalesIds(selectedIds);
	}, [rowSelection, setSelectedSalesIds, tableData]);

	useEffect(() => {
		return () => {
			setSelectedSalesIds([]);
		};
	}, [setSelectedSalesIds]);

	const table = useReactTable({
		data: tableData,
		getRowId: (row) => row.uuid,
		columns,
		onRowSelectionChange: setRowSelection,
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
			rowSelection,
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
		startFromColumn: 2,
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
		const scrollElement = parentRef.current;
		if (!scrollElement) return;

		let raf: number | null = null;
		const updateScrollState = () => {
			if (raf !== null) {
				cancelAnimationFrame(raf);
			}

			raf = requestAnimationFrame(() => {
				setIsTableScrolled(scrollElement.scrollTop > 0);
				raf = null;
			});
		};

		updateScrollState();
		scrollElement.addEventListener("scroll", updateScrollState, {
			passive: true,
		});

		return () => {
			scrollElement.removeEventListener("scroll", updateScrollState);
			if (raf !== null) {
				cancelAnimationFrame(raf);
			}
			setIsTableScrolled(false);
		};
	}, [setIsTableScrolled]);

	useEffect(() => {
		if (tableData.length === 0) {
			setIsTableScrolled(false);
		}
	}, [setIsTableScrolled, tableData.length]);

	useInfiniteScroll<HTMLDivElement>({
		scrollRef: parentRef,
		rowVirtualizer,
		rowCount: rows.length,
		hasNextPage: singlePage ? false : hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	});

	const handleCellClick = useCallback(
		(rowId: string) => {
			overviewQuery.open2(rowId, "sales");
		},
		[overviewQuery],
	);
	const rowClassName = useCallback(
		(row: (typeof rows)[number]) =>
			salesInboundRowClassName(row.original.inboundStatus),
		[],
	);

	const showBottomBar = Object.keys(rowSelection).length > 0;

	if (hasFilters && tableData.length === 0) {
		return <NoResults />;
	}

	if (tableData.length === 0) {
		return <EmptyState />;
	}

	const virtualItems = rowVirtualizer.getVirtualItems();
	const tableHeight = embedded
		? `${tableConfig.headerHeight + Math.max(1, Math.min(rows.length, 5)) * tableConfig.rowHeight}px`
		: "calc(100vh - 350px + var(--header-offset, 0px))";

	return (
		<div className="relative">
			<div className="w-full">
				<div
					ref={(element) => {
						parentRef.current = element;
						tableScroll.containerRef.current = element;
					}}
					className="overflow-auto overscroll-contain border-b border-l border-r border-border scrollbar-hide"
					style={{
						height: tableHeight,
					}}
				>
					<DndContext
						id="sales-orders-table-dnd"
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
											isSelected={rowSelection[row.id] ?? false}
											rowClassName={rowClassName}
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

			<AnimatePresence>
				{showBottomBar && <BottomBar data={tableData} />}
			</AnimatePresence>
		</div>
	);
}
