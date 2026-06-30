"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useSortParams } from "@/hooks/use-sort-params";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { useUnitInvoiceParams } from "@/hooks/use-unit-invoice-params";
import { useUnitInvoiceFilterParams } from "@/hooks/use-unit-invoices-filter-params";
import { useTRPC } from "@/trpc/client";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Table, TableBody } from "@gnd/ui/table";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { type UnitInvoiceRow, columns, getUnitInvoiceRowId } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useUnitInvoicesTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["actions"]);
const TABLE_ID = "unit-invoices";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type UnitInvoicesInput = RouterInputs["community"]["getUnitInvoices"];
type UnitInvoicesPage = {
	data?: UnitInvoiceRow[];
	meta?: {
		cursor?: string | number | null;
	};
};

type Props = {
	initialSettings?: Partial<TableSettings>;
	defaultFilters?: UnitInvoicesInput;
	embedded?: boolean;
	columns?: ColumnDef<UnitInvoiceRow>[];
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
	const { filters, hasFilters } = useUnitInvoiceFilterParams();
	const { setParams: setInvoiceParams } = useUnitInvoiceParams();
	const parentRef = useRef<HTMLDivElement>(null);
	const columnIds = useMemo(() => getColumnIds(activeColumns), [activeColumns]);
	const setColumns = useUnitInvoicesTableStore((state) => state.setColumns);
	const bindShowColumnDividers = useUnitInvoicesTableStore(
		(state) => state.bindShowColumnDividers,
	);

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
		tableId: "unit-invoices",
		initialSettings,
		columnIds,
		showColumnDividers: true,
	});

	const queryInput = {
		...filters,
		...(defaultFilters || {}),
		sort: params.sort,
	} as UnitInvoicesInput;

	const infiniteQueryOptions =
		trpc.community.getUnitInvoices.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		});

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<UnitInvoicesPage>(infiniteQueryOptions as never);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	const table = useReactTable({
		data: tableData,
		getRowId: getUnitInvoiceRowId,
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
		hasNextPage: singlePage ? false : hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	});

	const handleCellClick = useCallback(
		(rowId: string) => {
			const editUnitInvoiceId = Number(rowId);
			if (!Number.isFinite(editUnitInvoiceId)) return;

			setInvoiceParams({
				editUnitInvoiceId,
			});
		},
		[setInvoiceParams],
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
							: "calc(100vh - 240px + var(--header-offset, 0px))",
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
									/>
								);
							})}
						</TableBody>
					</Table>
				</div>
			</div>
		</div>
	);
}
