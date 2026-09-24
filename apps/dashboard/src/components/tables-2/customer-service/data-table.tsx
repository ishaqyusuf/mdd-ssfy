"use client";

import { useCustomerServiceScrollArea } from "@/components/customer-service-scroll-area";
import { VirtualRow } from "@/components/tables-2/core";
import { useCustomerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
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
import { Button } from "@gnd/ui/button";
import { Table, TableBody } from "@gnd/ui/table";
import { formatDate } from "@gnd/utils/dayjs";
import { useQuery, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
	type RowSelectionState,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { BottomBar } from "./bottom-bar";
import {
	Actions,
	AssignedTo,
	type CustomerServiceRow,
	StatusCell,
	columns,
	getCustomerServiceRowId,
} from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useCustomerServiceTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set([
	"select",
	"assignedTo",
	"status",
	"actions",
]);
const COLUMN_IDS = getColumnIds(columns);
const TABLE_ID = "customer-service";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type CustomerServiceInput =
	RouterInputs["customerService"]["getCustomerServices"];
type CustomerServicePage = {
	data?: CustomerServiceRow[];
	meta?: {
		cursor?: string | number | null;
	};
};

type Props = {
	initialSettings?: Partial<TableSettings>;
	defaultFilters?: CustomerServiceInput;
	singlePage?: boolean;
};

export function DataTable({
	initialSettings,
	defaultFilters,
	singlePage,
}: Props) {
	const trpc = useTRPC();
	const { setParams } = useCustomerServiceParams();
	const { params } = useSortParams();
	const { filters, hasFilters } = useCustomerServiceFilterParams();
	const scrollRef = useCustomerServiceScrollArea();
	const tableBodyRef = useRef<HTMLTableSectionElement>(null);
	const [scrollMargin, setScrollMargin] = useState(0);
	const { rowSelection, setRowSelection, setColumns, bindShowColumnDividers } =
		useCustomerServiceTableStore();

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
		tableId: "customer-service",
		initialSettings,
		columnIds: COLUMN_IDS,
		showColumnDividers: true,
	});

	const queryInput = {
		...filters,
		...(defaultFilters || {}),
		sort: params.sort,
	} as CustomerServiceInput;

	const infiniteQueryOptions =
		trpc.customerService.getCustomerServices.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		});

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery<CustomerServicePage>(
			infiniteQueryOptions as never,
		);
	const { data: employeesResp } = useQuery(
		trpc.customerService.getAssignees.queryOptions(undefined, {
			staleTime: 60_000,
		}),
	);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	const table = useReactTable({
		data: tableData,
		getRowId: getCustomerServiceRowId,
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
		meta: {
			employees: employeesResp,
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
	useLayoutEffect(() => {
		const scrollArea = scrollRef.current;
		if (!scrollArea) return;
		tableScroll.containerRef.current = scrollArea;
		const measure = () => {
			const body = tableBodyRef.current;
			if (!body) return;
			const margin = Math.round(
				body.getBoundingClientRect().top -
					scrollArea.getBoundingClientRect().top +
					scrollArea.scrollTop,
			);
			setScrollMargin((current) => (current === margin ? current : margin));
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(scrollArea);
		if (scrollArea.firstElementChild)
			observer.observe(scrollArea.firstElementChild);
		return () => {
			observer.disconnect();
			tableScroll.containerRef.current = null;
		};
	}, [scrollRef, tableScroll.containerRef]);
	const rows = table.getRowModel().rows;
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scrollRef.current,
		scrollMargin,
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
		scrollRef,
		rowVirtualizer,
		rowCount: rows.length,
		hasNextPage: singlePage ? false : hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	});

	if (hasFilters && tableData.length === 0) {
		return <NoResults />;
	}

	if (tableData.length === 0) {
		return <EmptyState />;
	}

	const virtualItems = rowVirtualizer.getVirtualItems();
	const showBottomBar = Object.keys(rowSelection).length > 0;

	return (
		<div className="relative md:-mt-6">
			<div className="space-y-3 md:hidden">
				{tableData.map((item) => (
					<article
						key={item.id}
						className="rounded-xl border bg-card p-4 shadow-sm"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									{item.projectName || "Work order"}
								</p>
								<h3 className="mt-1 truncate text-base font-semibold">
									{item.homeOwner || "No homeowner"}
								</h3>
								{item.homePhone ? (
									<p className="text-xs text-muted-foreground">
										{item.homePhone}
									</p>
								) : null}
							</div>
							<StatusCell item={item} />
						</div>
						<p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
							{item.description || "No description provided"}
						</p>
						<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
							<div>
								<p className="text-[11px] uppercase tracking-wide text-muted-foreground">
									Appointment
								</p>
								<p className="text-sm font-medium">
									{item.scheduleDate
										? formatDate(item.scheduleDate)
										: "Not scheduled"}
								</p>
								{item.scheduleTime ? (
									<p className="text-xs text-muted-foreground">
										{item.scheduleTime}
									</p>
								) : null}
							</div>
							<AssignedTo item={item} employees={employeesResp ?? []} />
						</div>
						<div className="mt-3 flex items-center justify-between">
							<Button
								variant="link"
								className="px-0"
								onClick={() =>
									void setParams({ openCustomerServiceOverviewId: item.id })
								}
							>
								View details
							</Button>
							<Actions item={item} />
						</div>
					</article>
				))}
				{hasNextPage && !singlePage ? (
					<Button
						className="w-full"
						variant="outline"
						disabled={isFetchingNextPage}
						onClick={() => fetchNextPage()}
					>
						{isFetchingNextPage
							? "Loading work orders..."
							: "Load more work orders"}
					</Button>
				) : null}
			</div>
			<div className="hidden w-full md:block">
				<div className="border-b border-l border-r border-border">
					<DndContext
						id="customer-service-table-dnd"
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<Table className="w-full min-w-full">
							<DataTableHeader
								table={table}
								tableScroll={tableScroll}
								showColumnDividers={showColumnDividers}
								stickyTop="var(--customer-service-toolbar-height, 0px)"
							/>

							<TableBody
								ref={tableBodyRef}
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
											onCellClick={(rowId) =>
												void setParams({
													openCustomerServiceOverviewId: Number(rowId),
												})
											}
											virtualStart={virtualRow.start - scrollMargin}
											rowHeight={tableConfig.rowHeight}
											fillColumnId={tableConfig.fillColumnId}
											tableStyle={tableConfig.style}
											getStickyStyle={getStickyStyle}
											getStickyClassName={getStickyClassName}
											nonClickableColumns={NON_CLICKABLE_COLUMNS}
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
					</DndContext>
				</div>
			</div>
			<AnimatePresence>
				{showBottomBar ? <BottomBar data={tableData} /> : null}
			</AnimatePresence>
		</div>
	);
}
