"use client";

import {
	SalesPriorityBadge,
	salesPriorityRowClassName,
} from "@/components/sales-priority-control";
import { VirtualRow } from "@/components/tables-2/core";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Table, TableBody } from "@gnd/ui/table";
import { resolveSalesProductionWorkspaceQuery } from "@sales/production-workspace-query";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { BottomBar } from "./bottom-bar";
import {
	getActiveSalesProductionStickyColumns,
	placeOrderDateAfterDueDate,
	shouldShowSalesProductionOrderDate,
} from "./column-layout";
import {
	type SalesProductionRow,
	columns,
	getSalesProductionRowId,
	workerColumns,
} from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useSalesProductionTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"]);
const TABLE_ID = "sales-production";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type SalesProductionInput = RouterInputs["sales"]["productions"];
type SalesProductionPage = {
	data?: SalesProductionRow[];
	meta?: {
		cursor?: string | number | null;
	};
};

type Props = {
	initialSettings?: Partial<TableSettings>;
	defaultFilters?: SalesProductionInput;
	workerMode?: boolean;
};

export function DataTable({
	initialSettings,
	defaultFilters,
	workerMode,
}: Props) {
	const trpc = useTRPC();
	const { filters, hasFilters } = useSalesProductionFilterParams();
	const overviewQuery = useSalesOverviewQuery();
	const parentRef = useRef<HTMLDivElement>(null);
	const activeColumns = workerMode ? workerColumns : columns;
	const columnIds = useMemo(() => getColumnIds(activeColumns), [activeColumns]);
	const activeStickyColumns = useMemo(
		() =>
			getActiveSalesProductionStickyColumns(
				tableConfig.stickyColumns,
				columnIds,
			),
		[columnIds],
	);
	const { rowSelection, setRowSelection, setColumns, bindShowColumnDividers } =
		useSalesProductionTableStore();

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
		tableId: "sales-production",
		initialSettings,
		columnIds,
		showColumnDividers: true,
	});

	const resolvedFilters = resolveSalesProductionWorkspaceQuery(filters);
	const showOrderDate = shouldShowSalesProductionOrderDate(resolvedFilters);
	const effectiveColumnVisibility = useMemo(
		() => ({ ...columnVisibility, orderDate: !workerMode && showOrderDate }),
		[columnVisibility, showOrderDate, workerMode],
	);
	const effectiveColumnOrder = useMemo(
		() =>
			workerMode
				? columnOrder
				: placeOrderDateAfterDueDate(columnOrder, columnIds),
		[columnIds, columnOrder, workerMode],
	);
	const hasExplicitWorkerView = Boolean(
		filters.show ||
			filters.productionDueDate ||
			filters.tab === "calendar" ||
			filters.production === "completed",
	);
	const queryInput = {
		...(workerMode
			? hasExplicitWorkerView
				? resolvedFilters.list
				: {
						...(defaultFilters || {}),
						...resolvedFilters.list,
					}
			: resolvedFilters.list),
		size: 20,
	} as SalesProductionInput;

	const infiniteQueryOptions = workerMode
		? trpc.sales.productionTasks.infiniteQueryOptions(queryInput, {
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			})
		: trpc.sales.productions.infiniteQueryOptions(queryInput, {
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			});

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<SalesProductionPage>(
			infiniteQueryOptions as never,
		);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	const table = useReactTable({
		data: tableData,
		getRowId: getSalesProductionRowId,
		columns: activeColumns,
		onRowSelectionChange: setRowSelection,
		enableRowSelection: !workerMode,
		getCoreRowModel: getCoreRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		enableColumnResizing: true,
		columnResizeMode: "onChange",
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		state: {
			columnVisibility: effectiveColumnVisibility,
			columnSizing,
			columnOrder: effectiveColumnOrder,
			rowSelection,
		},
	});

	const { getStickyStyle, getStickyClassName } = useStickyColumns({
		columnVisibility: effectiveColumnVisibility,
		table,
		stickyColumns: activeStickyColumns,
	});
	const { sensors, handleDragEnd } = useTableDnd(table);
	const tableScroll = useTableScroll({
		useColumnWidths: true,
		startFromColumn: workerMode ? 1 : 2,
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
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	});

	const handleCellClick = useCallback(
		(rowId: string) => {
			overviewQuery.open2(
				rowId,
				workerMode ? "production-tasks" : "sales-production",
			);
		},
		[overviewQuery, workerMode],
	);

	const rowClassName = useCallback(
		(row: (typeof rows)[number]) =>
			salesPriorityRowClassName(
				(row.original as SalesProductionRow & { priority?: string | null })
					.priority,
			),
		[],
	);

	if (hasFilters && tableData.length === 0) {
		return <NoResults />;
	}

	if (tableData.length === 0) {
		return <EmptyState />;
	}

	const virtualItems = rowVirtualizer.getVirtualItems();
	const showBottomBar = Object.values(rowSelection).some(Boolean);

	return (
		<div className="relative">
			<div className="md:hidden">
				<div className="grid min-w-0 gap-2">
					{tableData.map((item) => {
						const rowId = getSalesProductionRowId(item);

						return (
							<div
								key={rowId}
								className="flex min-w-0 overflow-hidden rounded-lg border bg-background transition-colors hover:bg-muted/50"
							>
								{workerMode ? null : (
									<div className="flex shrink-0 items-start p-3 pr-0">
										<Checkbox
											aria-label={`Select ${item.orderId}`}
											checked={rowSelection[rowId] ?? false}
											onCheckedChange={(checked) => {
												table.getRow(rowId).toggleSelected(checked === true);
											}}
										/>
									</div>
								)}
								<button
									type="button"
									onClick={() => handleCellClick(rowId)}
									className="min-h-11 min-w-0 flex-1 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-mono text-sm font-semibold uppercase">
													{item.orderId}
												</span>
												<SalesPriorityBadge priority={item.priority} />
											</div>
											<p className="mt-1 truncate text-sm font-medium uppercase">
												{item.customer || "Customer unavailable"}
											</p>
										</div>
										<Badge variant="secondary" className="shrink-0">
											{item.status?.production?.workflow?.label ||
												item.status?.production?.status ||
												"Not assigned"}
										</Badge>
									</div>
									<div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
										<MobileCardField
											label="Due"
											value={
												item.dueDateLabel || item.alert?.text || "No due date"
											}
										/>
										<MobileCardField
											label="Assigned"
											value={item.assignedTo || "Unassigned"}
										/>
										<MobileCardField
											label="Materials"
											value={materialStateLabel(item.materials.state)}
										/>
										{workerMode ? null : (
											<MobileCardField
												label="Invoice"
												value={productionInvoiceLabel(item)}
											/>
										)}
										<MobileCardField
											label="Progress"
											value={`${Math.round(item.status?.production?.workflow?.percentage || 0)}%`}
										/>
									</div>
								</button>
							</div>
						);
					})}
				</div>
				{hasNextPage ? (
					<Button
						variant="outline"
						className="mt-3 h-11 w-full"
						disabled={isFetchingNextPage}
						onClick={() => fetchNextPage()}
					>
						{isFetchingNextPage ? "Loading..." : "Load more"}
					</Button>
				) : null}
			</div>
			<div className="hidden w-full md:block">
				<div
					ref={(element) => {
						parentRef.current = element;
						tableScroll.containerRef.current = element;
					}}
					className="overflow-auto overscroll-contain border-b border-l border-r border-border scrollbar-hide"
					style={{
						height: "calc(100vh - 350px + var(--header-offset, 0px))",
					}}
				>
					<DndContext
						id="sales-production-table-dnd"
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<Table className="w-full min-w-full">
							<DataTableHeader
								table={table}
								tableScroll={tableScroll}
								stickyColumns={activeStickyColumns}
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
											columnOrder={effectiveColumnOrder}
											columnVisibility={effectiveColumnVisibility}
											showColumnDividers={showColumnDividers}
											rowClassName={rowClassName}
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
				{!workerMode && showBottomBar ? <BottomBar data={tableData} /> : null}
			</AnimatePresence>
		</div>
	);
}

function MobileCardField({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0">
			<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p className="mt-0.5 truncate font-medium">{value}</p>
		</div>
	);
}

function materialStateLabel(state: SalesProductionRow["materials"]["state"]) {
	if (state === "ready") return "Available";
	if (state === "pending") return "Pending";
	if (state === "not_configured") return "Needs review";
	return "Unavailable";
}

function productionInvoiceLabel(item: SalesProductionRow) {
	const invoice = item.invoice;
	if (invoice.status === "unknown" || invoice.total == null) return "Not set";
	if (invoice.status === "paid") {
		return `Paid · ${formatCurrency.format(invoice.total)}`;
	}
	return `Due ${formatCurrency.format(invoice.amountDue || 0)}`;
}
