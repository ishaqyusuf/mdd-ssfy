"use client";

import Portal from "@/components/_v1/portal";
import { SalesData } from "@/components/resolution-center/sales-data";
import { VirtualRow } from "@/components/tables-2/core";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useResolutionCenterFilterParams } from "@/hooks/use-resolution-center-filter-params";
import { useResolutionCenterParams } from "@/hooks/use-resolution-center-params";
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
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { Table, TableBody } from "@gnd/ui/table";
import { useQuery, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
	type RowSelectionState,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { BottomBar } from "./bottom-bar";
import {
	type SalesResolutionRow,
	getRecommendedResolutionAction,
	getSalesResolutionColumns,
	getSalesResolutionRowId,
	hasDueMismatch,
} from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useSalesResolutionTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"]);
const TABLE_ID = "sales-resolution";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type SalesResolutionInput = RouterInputs["sales"]["getSalesResolutions"];
type SalesResolutionPage = {
	data?: SalesResolutionRow[];
	meta?: {
		cursor?: string | number | null;
	};
};

type Props = {
	initialSettings?: Partial<TableSettings>;
	defaultFilters?: SalesResolutionInput;
	singlePage?: boolean;
};

export function DataTable({
	initialSettings,
	defaultFilters,
	singlePage,
}: Props) {
	const trpc = useTRPC();
	const { filters, hasFilters } = useResolutionCenterFilterParams();
	const { params: sortParams } = useSortParams();
	const { params, setParams } = useResolutionCenterParams();
	const selectedIds = params.resolutionIds ?? [];
	const parentRef = useRef<HTMLDivElement>(null);
	const { rowSelection, setRowSelection, setColumns, bindShowColumnDividers } =
		useSalesResolutionTableStore();

	useScrollHeader(parentRef);

	const handleOpenDetails = useCallback(
		(row: SalesResolutionRow) => {
			const nextIds = selectedIds.includes(row.id)
				? selectedIds.filter((id) => id !== row.id)
				: [...selectedIds, row.id];

			setParams({
				resolutionIds: nextIds.length ? nextIds : null,
			});
		},
		[selectedIds, setParams],
	);
	const columns = useMemo(
		() =>
			getSalesResolutionColumns({
				onOpenDetails: handleOpenDetails,
				selectedIds,
			}),
		[handleOpenDetails, selectedIds],
	);
	const columnIds = useMemo(() => getColumnIds(columns), [columns]);

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
		...filters,
		...(defaultFilters || {}),
		sort: sortParams.sort?.[0] ?? null,
	} as SalesResolutionInput;

	const infiniteQueryOptions =
		trpc.sales.getSalesResolutions.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		});

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<SalesResolutionPage>(
			infiniteQueryOptions as never,
		);
	const { data: summary } = useQuery(
		trpc.sales.getSalesResolutionsSummary.queryOptions(queryInput),
	);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);
	const selectedRows = useMemo(() => {
		if (!selectedIds.length) return [];
		const selected = new Set(selectedIds);
		return tableData.filter((row) => selected.has(row.id));
	}, [selectedIds, tableData]);

	const table = useReactTable({
		data: tableData,
		getRowId: getSalesResolutionRowId,
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

	const handleCellClick = useCallback(
		(rowId: string) => {
			const row = tableData.find(
				(item) => getSalesResolutionRowId(item) === rowId,
			);
			if (!row) return;

			handleOpenDetails(row);
		},
		[handleOpenDetails, tableData],
	);

	if (hasFilters && tableData.length === 0) {
		return <NoResults />;
	}

	if (tableData.length === 0) {
		return <EmptyState />;
	}

	const virtualItems = rowVirtualizer.getVirtualItems();
	const showBottomBar = Object.keys(rowSelection).length > 0;
	const conflictCount =
		summary?.unresolvedCount ??
		tableData.filter((row) => row.status && row.status !== "resolved").length;

	return (
		<div className="relative space-y-4">
			<Portal nodeId="resolutionHeaderActions" noDelay>
				<Badge variant="destructive" className="text-sm">
					<Icons.AlertTriangle className="mr-1 h-4 w-4" />
					{conflictCount} Conflicts
				</Badge>
			</Portal>

			<div className="w-full">
				<div
					ref={(element) => {
						parentRef.current = element;
						tableScroll.containerRef.current = element;
					}}
					className="overflow-auto overscroll-contain border-b border-l border-r border-border scrollbar-hide"
					style={{
						height:
							"max(360px, calc(100vh - 330px + var(--header-offset, 0px)))",
					}}
				>
					<DndContext
						id="sales-resolution-table-dnd"
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
											isSelected={selectedIds.includes(row.original.id)}
											rowClassName={(currentRow) =>
												selectedIds.includes(currentRow.original.id)
													? "bg-muted/50"
													: ""
											}
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

			<ResolutionDetails rows={selectedRows} onToggle={handleOpenDetails} />

			<AnimatePresence>
				{showBottomBar ? <BottomBar data={tableData} /> : null}
			</AnimatePresence>
		</div>
	);
}

function ResolutionDetails({
	rows,
	onToggle,
}: {
	rows: SalesResolutionRow[];
	onToggle: (row: SalesResolutionRow) => void;
}) {
	if (!rows.length) {
		return null;
	}

	return (
		<div className="space-y-3">
			{rows.map((row) => {
				const dueMismatch = hasDueMismatch(row);
				const recommendedAction = getRecommendedResolutionAction(row);

				return (
					<Card key={row.id} className="overflow-hidden rounded-md">
						<div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
							<div className="min-w-0">
								<div className="truncate text-sm font-semibold">
									Review #{row.orderId}
								</div>
								<div className="truncate text-xs text-muted-foreground">
									{row.customer?.businessName ||
										row.customer?.name ||
										"Customer"}{" "}
									• {recommendedAction}
								</div>
							</div>
							<Button
								size="icon-xs"
								variant="ghost"
								aria-label={`Close ${row.orderId} details`}
								onClick={() => onToggle(row)}
							>
								<Icons.X className="size-3" />
							</Button>
						</div>
						<SalesData
							sale={row}
							recommendedAction={recommendedAction}
							dueMismatch={dueMismatch}
						/>
					</Card>
				);
			})}
		</div>
	);
}
