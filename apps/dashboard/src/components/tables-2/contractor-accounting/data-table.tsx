"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { DataTableHeader } from "@/components/tables-2/sales-accounting/table-header";
import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
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
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { BookOpenText, SearchX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	type ContractorAccountingRow,
	columns,
	getContractorAccountingRowId,
} from "./columns";
import { useContractorAccountingTableStore } from "./store";

const TABLE_ID = "contractor-accounting";
const COLUMN_IDS = getColumnIds(columns);
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type LedgerInput = RouterInputs["contractorAccounting"]["entries"];
type LedgerPage = {
	data?: ContractorAccountingRow[];
	meta?: { cursor?: string | null };
};

export function ContractorAccountingDataTable({
	initialSettings,
}: {
	initialSettings?: Partial<TableSettings>;
}) {
	const trpc = useTRPC();
	const { filters, hasFilters, setParams } =
		useContractorAccountingFilterParams();
	const parentRef = useRef<HTMLDivElement>(null);
	const { setColumns, bindShowColumnDividers } =
		useContractorAccountingTableStore();
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
		columnIds: COLUMN_IDS,
		showColumnDividers: true,
	});
	const input = {
		...filters,
		pageSize: 50,
		sortDirection: "desc",
	} as LedgerInput;
	const options = trpc.contractorAccounting.entries.infiniteQueryOptions(
		input,
		{
			getNextPageParam: ({ meta }) => meta.cursor,
		},
	);
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<LedgerPage>(options as never);
	const tableData = useMemo(
		() => data?.pages.flatMap((page) => page.data || []) || [],
		[data],
	);
	const table = useReactTable({
		data: tableData,
		columns,
		getRowId: getContractorAccountingRowId,
		getCoreRowModel: getCoreRowModel(),
		enableColumnResizing: true,
		columnResizeMode: "onChange",
		onColumnVisibilityChange: setColumnVisibility,
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		state: { columnVisibility, columnSizing, columnOrder },
	});
	const { getStickyStyle, getStickyClassName } = useStickyColumns({
		table,
		columnVisibility,
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

	useEffect(() => setColumns(table.getAllLeafColumns()), [setColumns, table]);
	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, setShowColumnDividers, showColumnDividers]);
	useInfiniteScroll<HTMLDivElement>({
		scrollRef: parentRef,
		rowVirtualizer,
		rowCount: rows.length,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	});

	const openEntry = useCallback(
		(id: string) => void setParams({ entryId: id }),
		[setParams],
	);

	if (!tableData.length) {
		return (
			<div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
				{hasFilters ? (
					<SearchX className="mb-4 size-8 text-muted-foreground" />
				) : (
					<BookOpenText className="mb-4 size-8 text-muted-foreground" />
				)}
				<h3 className="font-semibold">
					{hasFilters ? "No matching ledger entries" : "No ledger entries"}
				</h3>
				<p className="mt-1 max-w-md text-sm text-muted-foreground">
					{hasFilters
						? "Adjust the search, date, contractor, or accounting filters."
						: "Approved work, adjustments, and payouts will appear here."}
				</p>
			</div>
		);
	}

	return (
		<div
			ref={(element) => {
				parentRef.current = element;
				tableScroll.containerRef.current = element;
			}}
			className="overflow-auto overscroll-contain rounded-xl border scrollbar-hide"
			style={{
				height: "max(420px, calc(100vh - 430px + var(--header-offset, 0px)))",
			}}
		>
			<DndContext
				id="contractor-accounting-table-dnd"
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<Table className="w-full min-w-full">
					<DataTableHeader
						table={table}
						tableId={TABLE_ID}
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
						{rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
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
									onCellClick={openEntry}
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
		</div>
	);
}

export function ContractorAccountingTableSkeleton() {
	return (
		<div className="h-[480px] animate-pulse rounded-xl border bg-muted/30" />
	);
}
