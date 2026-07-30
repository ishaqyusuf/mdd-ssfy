"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { DataTableHeader } from "@/components/tables-2/sales-accounting/table-header";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useSalesFinanceFilterParams } from "@/hooks/use-sales-finance-filter-params";
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
import { Button } from "@gnd/ui/button";
import { Table, TableBody } from "@gnd/ui/table";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
	type RowSelectionState,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { CircleDollarSign, SearchX, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type SalesFinanceRow, columns, getSalesFinanceRowId } from "./columns";
import { useSalesFinanceTableStore } from "./store";

const TABLE_ID = "sales-finance";
const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"]);
const COLUMN_IDS = getColumnIds(columns);
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type SalesFinanceInput = RouterInputs["salesFinance"]["transactions"];
type SalesFinancePage = {
	data?: SalesFinanceRow[];
	meta?: {
		cursor?: number | null;
	};
};

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function SalesFinanceDataTable({ initialSettings }: Props) {
	const trpc = useTRPC();
	const { filters, hasFilters, setParams } = useSalesFinanceFilterParams();
	const parentRef = useRef<HTMLDivElement>(null);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const { setColumns, bindShowColumnDividers } = useSalesFinanceTableStore();

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

	const queryInput = {
		...filters,
		size: 50,
	} as SalesFinanceInput;
	const infiniteQueryOptions =
		trpc.salesFinance.transactions.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) => meta.cursor,
		});
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<SalesFinancePage>(infiniteQueryOptions as never);
	const tableData = useMemo(
		() => data?.pages.flatMap((page) => page.data || []) || [],
		[data],
	);
	const table = useReactTable({
		data: tableData,
		columns,
		getRowId: getSalesFinanceRowId,
		getCoreRowModel: getCoreRowModel(),
		enableColumnResizing: true,
		columnResizeMode: "onChange",
		onColumnVisibilityChange: setColumnVisibility,
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		onRowSelectionChange: setRowSelection,
		state: {
			columnVisibility,
			columnSizing,
			columnOrder,
			rowSelection,
		},
	});
	const { getStickyStyle, getStickyClassName } = useStickyColumns({
		table,
		columnVisibility,
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
	}, [bindShowColumnDividers, setShowColumnDividers, showColumnDividers]);

	useInfiniteScroll<HTMLDivElement>({
		scrollRef: parentRef,
		rowVirtualizer,
		rowCount: rows.length,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	});

	const openTransaction = useCallback(
		(rowId: string) => {
			void setParams({ transactionId: Number(rowId) });
		},
		[setParams],
	);

	if (!tableData.length) {
		return (
			<div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
				{hasFilters ? (
					<SearchX className="mb-4 size-8 text-muted-foreground" />
				) : (
					<CircleDollarSign className="mb-4 size-8 text-muted-foreground" />
				)}
				<h3 className="font-semibold">
					{hasFilters ? "No matching payments" : "No payments in this period"}
				</h3>
				<p className="mt-1 max-w-md text-sm text-muted-foreground">
					{hasFilters
						? "Adjust the date, search, or review filters to widen the results."
						: "Payments connected to sales will appear here when they are recorded."}
				</p>
			</div>
		);
	}

	const virtualItems = rowVirtualizer.getVirtualItems();
	const selectedCount = Object.keys(rowSelection).length;

	return (
		<div className="relative">
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
					id="sales-finance-table-dnd"
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
										onCellClick={openTransaction}
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
			</div>
			{selectedCount > 0 ? (
				<div className="fixed inset-x-0 bottom-5 z-40 mx-auto flex w-fit items-center gap-4 rounded-full border bg-background px-4 py-2 shadow-xl">
					<span className="text-sm font-medium">{selectedCount} selected</span>
					<Button
						size="sm"
						variant="ghost"
						className="rounded-full"
						onClick={() => setRowSelection({})}
					>
						<X className="mr-2 size-4" />
						Clear
					</Button>
				</div>
			) : null}
		</div>
	);
}

export function SalesFinanceTableSkeleton() {
	return (
		<div className="h-[480px] animate-pulse rounded-b-xl border bg-muted/30" />
	);
}
