"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
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
import {
	type RowSelectionState,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

import { BottomBar } from "./bottom-bar";
import {
	type InventoryAllocationRow,
	type InventoryAllocationTableActions,
	getInventoryAllocationColumns,
	getInventoryAllocationRowId,
} from "./columns";
import { EmptyState } from "./empty-states";
import { useInventoryAllocationsTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"]);
const TABLE_ID = "inventory-allocations";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type InventoryAllocationsInput =
	RouterInputs["inventories"]["pendingAllocations"];
type InventoryAllocationsPage = {
	data?: InventoryAllocationRow[];
	meta?: {
		cursor?: string | number | null;
	};
};

type Props = {
	initialSettings?: Partial<TableSettings>;
	actions: InventoryAllocationTableActions;
	onApproveSelected: (allocationIds: number[]) => void;
	isApprovingSelected?: boolean;
	singlePage?: boolean;
};

export function DataTable({
	initialSettings,
	actions,
	onApproveSelected,
	isApprovingSelected,
	singlePage,
}: Props) {
	const trpc = useTRPC();
	const { params } = useSortParams();
	const parentRef = useRef<HTMLDivElement>(null);
	const { rowSelection, setRowSelection, setColumns, bindShowColumnDividers } =
		useInventoryAllocationsTableStore();
	const columns = useMemo(
		() => getInventoryAllocationColumns(actions),
		[actions],
	);
	const columnIds = useMemo(() => getColumnIds(columns), [columns]);

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

	const queryInput = {
		size: 20,
		sort: params.sort,
	} as InventoryAllocationsInput;

	const infiniteQueryOptions =
		trpc.inventories.pendingAllocations.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		});

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<InventoryAllocationsPage>(
			infiniteQueryOptions as never,
		);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	const table = useReactTable({
		data: tableData,
		getRowId: getInventoryAllocationRowId,
		columns,
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

	if (tableData.length === 0) {
		return <EmptyState />;
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
						height:
							"max(360px, calc(100vh - 420px + var(--header-offset, 0px)))",
					}}
				>
					<DndContext
						id="inventory-allocations-table-dnd"
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
				{showBottomBar ? (
					<BottomBar
						data={tableData}
						onApproveSelected={onApproveSelected}
						isApprovingSelected={isApprovingSelected}
					/>
				) : null}
			</AnimatePresence>
		</div>
	);
}
