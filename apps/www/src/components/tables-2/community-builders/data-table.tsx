"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useBuilderFilterParams } from "@/hooks/use-builder-filter-params";
import { useBuilderParams } from "@/hooks/use-builder-params";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useSortParams } from "@/hooks/use-sort-params";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { useTRPC } from "@/trpc/client";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Table, TableBody } from "@gnd/ui/table";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef } from "react";

import {
	type CommunityBuilderRow,
	columns,
	getCommunityBuilderRowId,
} from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useCommunityBuildersTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["actions"]);
const COLUMN_IDS = getColumnIds(columns);
const TABLE_ID = "community-builders";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type BuildersInput = RouterInputs["community"]["getBuilders"];
type BuildersPage = {
	data?: CommunityBuilderRow[];
	meta?: {
		cursor?: string | number | null;
	};
};

type Props = {
	initialSettings?: Partial<TableSettings>;
	defaultFilters?: BuildersInput;
	singlePage?: boolean;
};

export function DataTable({
	initialSettings,
	defaultFilters,
	singlePage,
}: Props) {
	const trpc = useTRPC();
	const { params } = useSortParams();
	const { filters, hasFilters } = useBuilderFilterParams();
	const { setParams } = useBuilderParams();
	const parentRef = useRef<HTMLDivElement>(null);
	const setColumns = useCommunityBuildersTableStore(
		(state) => state.setColumns,
	);
	const bindShowColumnDividers = useCommunityBuildersTableStore(
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
		tableId: "community-builders",
		initialSettings,
		columnIds: COLUMN_IDS,
		showColumnDividers: true,
	});

	const queryInput = {
		...filters,
		...(defaultFilters || {}),
		sort: params.sort,
	} as BuildersInput;

	const infiniteQueryOptions = trpc.community.getBuilders.infiniteQueryOptions(
		queryInput,
		{
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		},
	);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<BuildersPage>(infiniteQueryOptions as never);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	const table = useReactTable({
		data: tableData,
		getRowId: getCommunityBuilderRowId,
		columns,
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
			const builderId = Number(rowId);
			if (!Number.isFinite(builderId)) return;

			setParams({
				openBuilderId: builderId,
			});
		},
		[setParams],
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
						height: "calc(100vh - 240px + var(--header-offset, 0px))",
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
