"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useSortParams } from "@/hooks/use-sort-params";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
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
import { type SalesDispatch, getSalesDispatchColumns } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useSalesDispatchTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const TABLE_ID = "sales-dispatch";
const NON_CLICKABLE_COLUMNS = new Set([
	"select",
	"dueDate",
	"assignedTo",
	"status",
	"actions",
]);
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type DispatchInput = RouterInputs["dispatch"]["index"];
type DispatchPage = {
	data?: SalesDispatch[];
	meta?: {
		cursor?: string | number | null;
	};
};

type Props = {
	initialSettings?: Partial<TableSettings>;
	defaultFilters?: DispatchInput;
	driver?: boolean;
	singlePage?: boolean;
};

export function DataTable({
	initialSettings,
	defaultFilters,
	driver,
	singlePage,
}: Props) {
	const trpc = useTRPC();
	const { params } = useSortParams();
	const { filters } = useDispatchFilterParams();
	const overviewQuery = useSalesOverviewQuery();
	const parentRef = useRef<HTMLDivElement>(null);
	const tableColumns = useMemo(() => getSalesDispatchColumns(driver), [driver]);
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

	const routeFilters = useMemo(() => {
		const { view: _view, ...nextFilters } = filters;
		return nextFilters;
	}, [filters]);
	const queryInput = {
		...routeFilters,
		...(defaultFilters || {}),
		sort: params.sort,
	} as DispatchInput;

	const infiniteQueryOptions = driver
		? trpc.dispatch.assignedDispatch.infiniteQueryOptions(queryInput, {
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			})
		: trpc.dispatch.index.infiniteQueryOptions(queryInput, {
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			});

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<DispatchPage>(infiniteQueryOptions as never);

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

	useInfiniteScroll<HTMLDivElement>({
		scrollRef: parentRef,
		rowVirtualizer,
		rowCount: rows.length,
		hasNextPage: singlePage ? false : hasNextPage,
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

			overviewQuery.openDispatch(
				dispatch.order?.orderId,
				dispatch.id,
				"packing",
			);
		},
		[overviewQuery, rowById],
	);

	const hasRouteFilters = Object.entries(filters).some(
		([key, value]) => key !== "view" && value !== null,
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
						id="sales-dispatch-table-dnd"
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
											columnOrder={columnOrder}
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
