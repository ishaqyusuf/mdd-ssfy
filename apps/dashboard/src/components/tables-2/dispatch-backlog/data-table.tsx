"use client";

import { normalizeDispatchBacklogSort } from "@/components/dispatch-admin/dispatch-backlog-sort";
import { VirtualRow } from "@/components/tables-2/core";
import { DataTableHeader } from "@/components/tables-2/sales-dispatch/table-header";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useSortQuery } from "@/hooks/use-sort-query";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTRPC } from "@/trpc/client";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Table, TableBody } from "@gnd/ui/table";
import {
	useQueryClient,
	useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import {
	type RowSelectionState,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BottomBar } from "./bottom-bar";
import { type DispatchBacklogRow, getDispatchBacklogColumns } from "./columns";

const tableConfig = TABLE_CONFIGS["sales-dispatch"];
const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"]);

export function DataTable() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { filters, setFilters } = useDispatchFilterParams();
	const sortQuery = useSortQuery();
	const backlogSort = normalizeDispatchBacklogSort(sortQuery.sort);
	const requestedSort = sortQuery.sort?.[0];
	const normalizedSort = backlogSort[0];
	const [sortColumn, sortValue] = normalizedSort.split(".");
	const parentRef = useRef<HTMLDivElement>(null);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const columns = useMemo(
		() =>
			getDispatchBacklogColumns((row) =>
				setFilters({ dispatchSalesId: row.id, sheetMode: "create" }),
			),
		[setFilters],
	);

	useScrollHeader(parentRef);
	useEffect(() => {
		if (requestedSort !== normalizedSort) {
			sortQuery.setSortQuery([normalizedSort]);
		}
	}, [normalizedSort, requestedSort, sortQuery.setSortQuery]);
	const handleSort = useCallback(
		(field: string) => {
			if (field !== "createdAt") return;
			sortQuery.setSortQuery([
				normalizedSort === "createdAt.asc" ? "createdAt.desc" : "createdAt.asc",
			]);
		},
		[normalizedSort, sortQuery.setSortQuery],
	);
	const query = useSuspenseInfiniteQuery(
		trpc.dispatch.backlog.infiniteQueryOptions(
			{
				q: filters.q,
				deliveryModes: filters.deliveryModes,
				sort: backlogSort,
				size: 20,
			},
			{
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			},
		),
	);
	const tableData = useMemo<DispatchBacklogRow[]>(
		() => query.data.pages.flatMap((page) => page.data),
		[query.data.pages],
	);
	const backlogMeta = query.data.pages[0]?.meta as
		| { count?: number | null }
		| undefined;
	const backlogCount = Number(backlogMeta?.count);
	useEffect(() => {
		if (!Number.isFinite(backlogCount)) return;
		queryClient.setQueriesData(
			{ queryKey: trpc.dispatch.workspaceSummary.pathKey() },
			(current) =>
				current && typeof current === "object"
					? { ...current, backlog: backlogCount }
					: current,
		);
	}, [backlogCount, queryClient, trpc]);
	const table = useReactTable({
		data: tableData,
		getRowId: (row) => String(row.id),
		columns,
		getCoreRowModel: getCoreRowModel(),
		onRowSelectionChange: setRowSelection,
		state: { rowSelection },
	});
	const { getStickyStyle, getStickyClassName } = useStickyColumns({
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
	useInfiniteScroll<HTMLDivElement>({
		scrollRef: parentRef,
		rowVirtualizer,
		rowCount: rows.length,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
		fetchNextPage: query.fetchNextPage,
	});

	if (!tableData.length) {
		return (
			<div className="flex min-h-[420px] items-center justify-center border text-sm text-muted-foreground">
				{filters.q || filters.deliveryModes?.length
					? "No backlog orders match these filters."
					: "Dispatch backlog is clear."}
			</div>
		);
	}

	const virtualItems = rowVirtualizer.getVirtualItems();
	const selectedRows = tableData.filter((row) => rowSelection[String(row.id)]);

	return (
		<div className="relative">
			<div
				ref={(element) => {
					parentRef.current = element;
					tableScroll.containerRef.current = element;
				}}
				className="overflow-auto overscroll-contain border-b border-l border-r border-border scrollbar-hide"
				style={{ height: "calc(100vh - 260px + var(--header-offset, 0px))" }}
			>
				<DndContext
					id="dispatch-backlog-table-dnd"
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<Table className="w-full min-w-full">
						<DataTableHeader
							table={table}
							tableScroll={tableScroll}
							showColumnDividers
							sortState={{
								sortColumn,
								sortValue,
								createSortQuery: handleSort,
							}}
						/>
						<TableBody
							className="block border-x-0"
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
										onCellClick={() => undefined}
										columnSizing={{}}
										columnOrder={columns.map((column) => String(column.id))}
										columnVisibility={{}}
										showColumnDividers
										isSelected={row.getIsSelected()}
									/>
								);
							})}
						</TableBody>
					</Table>
				</DndContext>
			</div>
			<AnimatePresence>
				{selectedRows.length ? (
					<BottomBar
						rows={selectedRows}
						onDeselect={() => setRowSelection({})}
					/>
				) : null}
			</AnimatePresence>
		</div>
	);
}
