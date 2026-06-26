"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useSortParams } from "@/hooks/use-sort-params";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { useUnitProductionFilterParams } from "@/hooks/use-unit-productions-filter-params";
import { useUnitProductionParams } from "@/hooks/use-unit-productions-params";
import { useTRPC } from "@/trpc/client";
import { ROW_HEIGHTS, STICKY_COLUMNS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Table, TableBody } from "@gnd/ui/table";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	type RowSelectionState,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { BottomBar } from "./bottom-bar";
import {
	type UnitProductionRow,
	columns,
	getUnitProductionRowId,
} from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useUnitProductionsTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"]);
const ROW_HEIGHT = ROW_HEIGHTS["unit-productions"];

type UnitProductionsInput = RouterInputs["community"]["getUnitProductions"];
type UnitProductionsPage = {
	data?: UnitProductionRow[];
	meta?: {
		cursor?: string | number | null;
	};
};

type Props = {
	initialSettings?: Partial<TableSettings>;
	defaultFilters?: UnitProductionsInput;
	embedded?: boolean;
	columns?: ColumnDef<UnitProductionRow>[];
	singlePage?: boolean;
};

export function DataTable({
	initialSettings,
	defaultFilters,
	embedded,
	columns: activeColumns = columns,
	singlePage,
}: Props) {
	const trpc = useTRPC();
	const { params } = useSortParams();
	const { filters, hasFilters } = useUnitProductionFilterParams();
	const { setParams: setUnitProductionParams } = useUnitProductionParams();
	const parentRef = useRef<HTMLDivElement>(null);
	const columnIds = useMemo(() => getColumnIds(activeColumns), [activeColumns]);
	const { rowSelection, setRowSelection, setColumns, bindShowColumnDividers } =
		useUnitProductionsTableStore();

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
		tableId: "unit-productions",
		initialSettings,
		columnIds,
		showColumnDividers: true,
	});

	const queryInput = {
		...filters,
		...(defaultFilters || {}),
		sort: params.sort,
	} as UnitProductionsInput;

	const infiniteQueryOptions =
		trpc.community.getUnitProductions.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		});

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<UnitProductionsPage>(
			infiniteQueryOptions as never,
		);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	const table = useReactTable({
		data: tableData,
		getRowId: getUnitProductionRowId,
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
		stickyColumns: STICKY_COLUMNS["unit-productions"],
	});
	const tableScroll = useTableScroll({
		useColumnWidths: true,
		startFromColumn: 2,
	});
	const rows = table.getRowModel().rows;
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ROW_HEIGHT,
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

	const handleCellClick = useCallback(
		(rowId: string) => {
			const openUnitProductionId = Number(rowId);
			if (!Number.isFinite(openUnitProductionId)) return;

			setUnitProductionParams({
				openUnitProductionId,
			});
		},
		[setUnitProductionParams],
	);

	if (hasFilters && tableData.length === 0) {
		return <NoResults />;
	}

	if (tableData.length === 0) {
		return <EmptyState embedded={embedded} />;
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
						height: embedded
							? "min(520px, calc(100vh - 260px + var(--header-offset, 0px)))"
							: "calc(100vh - 330px + var(--header-offset, 0px))",
					}}
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
										rowHeight={ROW_HEIGHT}
										getStickyStyle={getStickyStyle}
										getStickyClassName={getStickyClassName}
										nonClickableColumns={NON_CLICKABLE_COLUMNS}
										onCellClick={handleCellClick}
										columnSizing={columnSizing}
										columnOrder={columnOrder}
										columnVisibility={columnVisibility}
										isSelected={rowSelection[row.id] ?? false}
										showColumnDividers={showColumnDividers}
									/>
								);
							})}
						</TableBody>
					</Table>
				</div>
			</div>
			{embedded ? null : <BottomBar data={tableData} />}
		</div>
	);
}
