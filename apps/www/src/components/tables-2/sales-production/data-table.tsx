"use client";

import { salesPriorityRowClassName } from "@/components/sales-priority-control";
import { VirtualRow } from "@/components/tables-2/core";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { useScrollHeader } from "@/hooks/use-scroll-header";
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
import { useCallback, useEffect, useMemo, useRef } from "react";

import {
	type SalesProductionRow,
	columns,
	getSalesProductionRowId,
	workerColumns,
} from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useSalesProductionTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["actions"]);
const TABLE_ID = "sales-production";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type SalesProductionInput = RouterInputs["sales"]["productions"];
type SalesProductionPage = {
	data?: SalesProductionRow[];
	meta?: {
		cursor?: string | number | null;
	};
};

type Props = {
	initialSettings?: Partial<TableSettings>;
	defaultFilters?: SalesProductionInput;
	workerMode?: boolean;
};

export function DataTable({
	initialSettings,
	defaultFilters,
	workerMode,
}: Props) {
	const trpc = useTRPC();
	const { filters, hasFilters } = useSalesProductionFilterParams();
	const overviewQuery = useSalesOverviewQuery();
	const parentRef = useRef<HTMLDivElement>(null);
	const activeColumns = workerMode ? workerColumns : columns;
	const columnIds = useMemo(() => getColumnIds(activeColumns), [activeColumns]);
	const { setColumns, bindShowColumnDividers } = useSalesProductionTableStore();

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
		tableId: "sales-production",
		initialSettings,
		columnIds,
		showColumnDividers: true,
	});

	const queryInput = {
		...(defaultFilters || {}),
		...Object.fromEntries(
			Object.entries(filters).filter(([, value]) => value !== null),
		),
	} as SalesProductionInput;

	const infiniteQueryOptions = workerMode
		? trpc.sales.productionTasks.infiniteQueryOptions(queryInput, {
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			})
		: trpc.sales.productions.infiniteQueryOptions(queryInput, {
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			});

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<SalesProductionPage>(
			infiniteQueryOptions as never,
		);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	const table = useReactTable({
		data: tableData,
		getRowId: getSalesProductionRowId,
		columns: activeColumns,
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

	useInfiniteScroll<HTMLDivElement>({
		scrollRef: parentRef,
		rowVirtualizer,
		rowCount: rows.length,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	});

	const handleCellClick = useCallback(
		(rowId: string) => {
			overviewQuery.open2(
				rowId,
				workerMode ? "production-tasks" : "sales-production",
			);
		},
		[overviewQuery, workerMode],
	);

	const rowClassName = useCallback(
		(row: (typeof rows)[number]) =>
			salesPriorityRowClassName(
				(row.original as SalesProductionRow & { priority?: string | null })
					.priority,
			),
		[],
	);

	if (hasFilters && tableData.length === 0) {
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
						height: "calc(100vh - 350px + var(--header-offset, 0px))",
					}}
				>
					<DndContext
						id="sales-production-table-dnd"
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
		</div>
	);
}
