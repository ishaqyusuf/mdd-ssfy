"use client";

import { salesInboundRowClassName } from "@/components/sales-inbound-status-badge";
import { clearCompletedRowSelection } from "@/lib/table-row-activity/selection";
import { observeTableRefresh } from "@/lib/table-row-activity/refresh";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTableRowsWithActivity } from "@/hooks/use-table-rows-with-activity";
import { VirtualRow } from "@/components/tables-2/core";
import { useCancelSalesOrdersRequests } from "@/hooks/use-cancel-sales-orders-requests";
import { useGuardedInfiniteScroll } from "@/hooks/use-guarded-infinite-scroll";
import {
	createSalesOrdersListQueryInput,
	useSalesOrdersV2FilterParams,
} from "@/hooks/use-sales-orders-v2-filter-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useSortParams } from "@/hooks/use-sort-params";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useTRPC } from "@/trpc/client";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Button } from "@gnd/ui/button";
import { Table, TableBody } from "@gnd/ui/table";
import {
	hashKey,
	useSuspenseInfiniteQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence } from "framer-motion";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useSyncExternalStore,
} from "react";

import { BottomBar } from "./bottom-bar";
import { columns } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set([
	"select",
	"inboundStatus",
	"invoiceTotal",
	"actions",
]);
const COLUMN_IDS = getColumnIds(columns);
const getEntityId = (row: { id: number }) => row.id;
const noRefresh = () => undefined;
const TABLE_ID = "sales-orders";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type Props = {
	initialSettings?: Partial<TableSettings>;
	bin?: boolean;
};

export function DataTable({ initialSettings, bin }: Props) {
	const trpc = useTRPC();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const searchParams = useSearchParams();
	const cancelSupersededOrdersRequests = useCancelSalesOrdersRequests();
	const { params } = useSortParams();
	const { filters, hasFilters } = useSalesOrdersV2FilterParams();
	const overviewQuery = useSalesOverviewQuery();
	const parentRef = useRef<HTMLDivElement>(null);
	const loadMoreRef = useRef<HTMLDivElement>(null);
	const { rowSelection, setRowSelection, setColumns, setSelectedSalesIds } =
		useSalesOrdersStore();

	useScrollHeader(parentRef, {
		extraOffset: bin ? 0 : tableConfig.summaryGridHeight,
	});

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
		tableId: "sales-orders",
		initialSettings,
		columnIds: COLUMN_IDS,
		showColumnDividers: true,
	});
	const bindShowColumnDividers = useSalesOrdersStore(
		(state) => state.bindShowColumnDividers,
	);
	const queryInput = useMemo(
		() =>
			createSalesOrdersListQueryInput({
				filters,
				bin,
				sort: params.sort,
			}),
		[bin, filters, params.sort],
	);

	const infiniteQueryOptions = useMemo(
		() =>
			trpc.sales.getOrders.infiniteQueryOptions(queryInput, {
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			}),
		[queryInput, trpc],
	);

	const {
		data,

		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useSuspenseInfiniteQuery(infiniteQueryOptions);
	const nextCursor = (
		data.pages.at(-1)?.meta as { cursor?: string | number | null } | undefined
	)?.cursor;
	const queryIdentity = useMemo(
		() => hashKey(infiniteQueryOptions.queryKey),
		[infiniteQueryOptions],
	);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	const refreshObserver = useMemo(
		() =>
			observeTableRefresh<typeof data>(
				queryClient,
				infiniteQueryOptions.queryKey,
				(result) => ({
					pageCount: result.pages.length,
					exhausted:
						(
							result.pages.at(-1)?.meta as
								| { cursor?: string | number | null }
								| undefined
						)?.cursor == null,
					entityIds: result.pages.flatMap((page) => page.data.map(getEntityId)),
				}),
			),
		[queryClient, queryIdentity],
	);
	const refreshReceipt = useSyncExternalStore(
		refreshObserver.subscribe,
		refreshObserver.getSnapshot,
		noRefresh,
	);
	const verifiedRefresh =
		refreshReceipt?.data === data ? refreshReceipt : undefined;
	const { displayRows, presentationById } = useTableRowsWithActivity({
		serverRows: tableData,
		ownerId: String(auth.id ?? ""),
		tableId: TABLE_ID,
		scopeKey: JSON.stringify([queryIdentity, searchParams.get("tabName")]),
		refresh: verifiedRefresh,
		getEntityId,
		onCommitted: (row) => {
			setRowSelection((current) =>
				clearCompletedRowSelection(current, new Set([row.uuid])),
			);
		},
		onCapture: (row) => {
			const focused =
				document.activeElement?.closest<HTMLElement>("[data-row-key]");
			if (focused?.dataset.rowKey === row.uuid)
				parentRef.current?.focus({ preventScroll: true });
		},
	});

	useEffect(() => {
		const selectedIds = tableData.reduce<number[]>((ids, order) => {
			if (rowSelection[order.uuid]) {
				ids.push(order.id);
			}

			return ids;
		}, []);

		setSelectedSalesIds(selectedIds);
	}, [rowSelection, setSelectedSalesIds, tableData]);

	useEffect(() => {
		return () => {
			setSelectedSalesIds([]);
		};
	}, [setSelectedSalesIds]);

	const table = useReactTable({
		data: displayRows,
		enableRowSelection: (row) =>
			!presentationById.get(row.original.id)?.interactionDisabled,
		getRowId: (row) => row.uuid,
		columns,
		onRowSelectionChange: setRowSelection,
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
			rowSelection,
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
		getItemKey: (index) => rows[index]!.id,
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

	const requestNextPage = useGuardedInfiniteScroll<HTMLDivElement>({
		scrollRef: parentRef,
		sentinelRef: loadMoreRef,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		requestKey: nextCursor,
		resetKey: queryIdentity,
	});

	const handleCellClick = useCallback(
		(rowId: string) => {
			overviewQuery.open2(rowId, "sales");
		},
		[overviewQuery],
	);
	const rowClassName = useCallback(
		(row: (typeof rows)[number]) =>
			salesInboundRowClassName(row.original.inboundStatus),
		[],
	);

	const activitySummary = [...presentationById.values()].reduce(
		(counts, item) => {
			counts.set(item.label, (counts.get(item.label) ?? 0) + 1);
			return counts;
		},
		new Map<string, number>(),
	);
	const activityAnnouncement = [...activitySummary]
		.map(
			([label, count]) =>
				`${count} ${count === 1 ? "order" : "orders"}: ${label}`,
		)
		.join(". ");
	const showBottomBar = Object.keys(rowSelection).length > 0;

	if (hasFilters && displayRows.length === 0) {
		return <NoResults onBeforeClear={cancelSupersededOrdersRequests} />;
	}

	if (displayRows.length === 0) {
		return <EmptyState />;
	}

	const virtualItems = rowVirtualizer.getVirtualItems();

	return (
		<div className="relative">
			<div
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				{activityAnnouncement}
			</div>
			<div className="w-full">
				<div
					ref={(element) => {
						parentRef.current = element;
						tableScroll.containerRef.current = element;
					}}
					tabIndex={-1}
					aria-label="Sales orders"
					className="overflow-auto overscroll-contain border-b border-l border-r border-border scrollbar-hide"
					style={{
						height: "calc(100vh - 350px + var(--header-offset, 0px))",
					}}
				>
					<DndContext
						id="sales-orders-table-dnd"
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<Table className="w-full min-w-full">
							<DataTableHeader
								table={table}
								tableScroll={tableScroll}
								showColumnDividers={showColumnDividers}
								onBeforeSortChange={cancelSupersededOrdersRequests}
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
											activity={presentationById.get(row.original.id)}
											activityLabelColumnId="status"
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
											isSelected={rowSelection[row.id] ?? false}
											rowClassName={rowClassName}
										/>
									);
								})}
							</TableBody>
						</Table>
					</DndContext>
					<div
						ref={loadMoreRef}
						className="flex min-h-10 items-center justify-center py-1"
						aria-live="polite"
					>
						{hasNextPage ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								disabled={isFetchingNextPage}
								onClick={requestNextPage}
							>
								{isFetchingNextPage
									? "Loading more orders…"
									: "Load more orders"}
							</Button>
						) : null}
					</div>
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
				{showBottomBar && (
					<BottomBar
						data={tableData}
						busy={tableData.some(
							(row) =>
								rowSelection[row.uuid] &&
								presentationById.get(row.id)?.interactionDisabled,
						)}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}
