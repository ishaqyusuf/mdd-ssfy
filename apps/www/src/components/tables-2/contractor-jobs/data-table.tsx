"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useJobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
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
import {
	type ColumnDef,
	type RowSelectionState,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence } from "framer-motion";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import { BottomBar } from "./bottom-bar";
import { type JobRow, columns, getJobRowId } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useContractorJobsTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["select", "status", "actions"]);
const TABLE_ID = "contractor-jobs";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type JobsInput = RouterInputs["jobs"]["getJobs"];
type JobsPage = {
	data?: JobRow[];
	meta?: {
		cursor?: string | number | null;
	};
};

type Props = {
	initialSettings?: Partial<TableSettings>;
	defaultFilters?: JobsInput;
	embedded?: boolean;
	columns?: ColumnDef<JobRow>[];
	singlePage?: boolean;
	emptyStateAction?: ReactNode;
};

export function DataTable({
	initialSettings,
	defaultFilters,
	embedded,
	columns: activeColumns = columns,
	singlePage,
	emptyStateAction,
}: Props) {
	const trpc = useTRPC();
	const { filters, hasFilters } = useJobFilterParams();
	const { setParams } = useJobParams();
	const parentRef = useRef<HTMLDivElement>(null);
	const { rowSelection, setRowSelection, setColumns, bindShowColumnDividers } =
		useContractorJobsTableStore();
	const columnIds = useMemo(() => getColumnIds(activeColumns), [activeColumns]);

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
		tableId: "contractor-jobs",
		initialSettings,
		columnIds,
		showColumnDividers: true,
	});

	const queryInput = {
		...filters,
		...(defaultFilters || {}),
	} as JobsInput;

	const infiniteQueryOptions = trpc.jobs.getJobs.infiniteQueryOptions(
		queryInput,
		{
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		},
	);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<JobsPage>(infiniteQueryOptions as never);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	const table = useReactTable({
		data: tableData,
		getRowId: getJobRowId,
		columns: activeColumns,
		getCoreRowModel: getCoreRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		enableColumnResizing: true,
		columnResizeMode: "onChange",
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		onRowSelectionChange: setRowSelection,
		state: {
			columnVisibility,
			columnSizing,
			columnOrder,
			rowSelection: rowSelection as RowSelectionState,
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

	if (hasFilters && tableData.length === 0) {
		return <NoResults />;
	}

	if (tableData.length === 0) {
		return <EmptyState action={emptyStateAction} embedded={embedded} />;
	}

	const virtualItems = rowVirtualizer.getVirtualItems();
	const showBottomBar = Object.keys(rowSelection).length > 0;

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
						height: embedded
							? "min(520px, calc(100vh - 260px + var(--header-offset, 0px)))"
							: "calc(100vh - 350px + var(--header-offset, 0px))",
					}}
				>
					<DndContext
						id="contractor-jobs-table-dnd"
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
											onCellClick={(rowId) => {
												setParams({
													openJobId: Number(rowId),
												});
											}}
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
				{embedded ? null : showBottomBar && <BottomBar data={tableData} />}
			</AnimatePresence>
		</div>
	);
}
