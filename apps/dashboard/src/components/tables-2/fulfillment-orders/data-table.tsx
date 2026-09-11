"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useFulfillmentParams } from "@/hooks/use-fulfillment-params";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useFulfillmentOrdersOptions } from "@/hooks/use-fulfillment-orders";
import { placeDispatchOrderDate } from "../sales-dispatch/order-date-layout";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";

import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";

import { DndContext, closestCenter } from "@dnd-kit/core";
import { Table, TableBody } from "@gnd/ui/table";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { BottomBar } from "./bottom-bar";
import { columns } from "./columns";
import { EmptyState, NoResults } from "../sales-dispatch/empty-states";
import { useSalesDispatchTableStore } from "../sales-dispatch/store";
import { DataTableHeader } from "../sales-dispatch/table-header";
const TABLE_ID = "sales-dispatch";
const NON_CLICKABLE_COLUMNS = new Set(["select", "actions", "invoice"]);
const defaultTableConfig = TABLE_CONFIGS[TABLE_ID];
type Props = { initialSettings?: Partial<TableSettings> };

export function DataTable({ initialSettings }: Props) {
	const tableConfig = defaultTableConfig;
	const queryOptions = useFulfillmentOrdersOptions();
	const { filters } = useDispatchFilterParams();
	const overviewQuery = useFulfillmentParams();
	const parentRef = useRef<HTMLDivElement>(null);
	const tableColumns = columns;
	const columnIds = useMemo(() => getColumnIds(tableColumns), [tableColumns]);
	const { rowSelection, setRowSelection, setColumns } =
		useSalesDispatchTableStore();
	const bindShowColumnDividers = useSalesDispatchTableStore(
		(state) => state.bindShowColumnDividers,
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
	} = useTableSettings({
		tableId: TABLE_ID,
		initialSettings,
		columnIds,
		showColumnDividers: true,
	});

	const effectiveColumnOrder = useMemo(
		() => placeDispatchOrderDate(columnOrder, columnIds),
		[columnOrder, columnIds],
	);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery(queryOptions);
	useEffect(() => {
		setRowSelection({});
		return () => setRowSelection({});
	}, [setRowSelection]);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	const table = useReactTable({
		data: tableData,
		getRowId: (row) => String(row.id),
		columns: tableColumns,
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
			columnOrder: effectiveColumnOrder,
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

	useInfiniteScroll<HTMLDivElement>({
		scrollRef: parentRef,
		rowVirtualizer,
		rowCount: rows.length,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	});

	const rowById = useMemo(() => {
		return new Map(
			tableData.map((dispatch) => [String(dispatch.id), dispatch]),
		);
	}, [tableData]);

	const handleCellClick = useCallback(
		(rowId: string) => {
			const dispatch = rowById.get(rowId);
			if (!dispatch) return;
			overviewQuery.openOrder(dispatch.id);
		},
		[overviewQuery, rowById],
	);

	const hasRouteFilters = Boolean(
		filters.q ||
			[
				filters.stages,
				filters.driversId,
				filters.dueBuckets,
				filters.deliveryModes,
				filters.risks,
				filters.scheduleRange,
			].some((value) => value?.length),
	);
	const showBottomBar = Object.values(rowSelection).some(Boolean);

	if (hasRouteFilters && tableData.length === 0) {
		return <NoResults />;
	}

	if (tableData.length === 0) {
		return <EmptyState />;
	}

	const virtualItems = rowVirtualizer.getVirtualItems();

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
						height: "calc(100vh - 260px + var(--header-offset, 0px))",
					}}
				>
					<DndContext
						id="fulfillment-orders-table-dnd"
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
											fillColumnId={tableConfig.fillColumnId}
											tableStyle={tableConfig.style}
											getStickyStyle={getStickyStyle}
											getStickyClassName={getStickyClassName}
											nonClickableColumns={NON_CLICKABLE_COLUMNS}
											onCellClick={handleCellClick}
											columnSizing={columnSizing}
											columnOrder={effectiveColumnOrder}
											columnVisibility={columnVisibility}
											showColumnDividers={showColumnDividers}
											isSelected={rowSelection[row.id] ?? false}
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
