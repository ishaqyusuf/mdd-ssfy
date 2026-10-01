"use client";

import { PaymentTableViewToggle } from "@/components/payment-dashboard/payment-table-view-toggle";
import { PayoutRecord } from "@/components/payment-dashboard/payout-record";
import { VirtualRow } from "@/components/tables-2/core";
import { RecordList } from "@/components/tables-2/core/record-list";
import { useContractorPayoutFilterParams } from "@/hooks/use-contractor-payout-filter-params";
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
import { Checkbox } from "@gnd/ui/checkbox";
import { Table, TableBody } from "@gnd/ui/table";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
	type RowSelectionState,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";

import { BottomBar } from "./bottom-bar";
import {
	type ContractorPayoutRow,
	columns,
	getContractorPayoutRowId,
} from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useContractorPayoutsTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"]);
const TABLE_ID = "contractor-payouts";
const COLUMN_IDS = getColumnIds(columns);
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type ContractorPayoutsInput = RouterInputs["jobs"]["contractorPayouts"];
type ContractorPayoutsPage = {
	data?: ContractorPayoutRow[];
	meta?: {
		cursor?: string | number | null;
	};
};

type Props = {
	records?: boolean;
	initialSettings?: Partial<TableSettings>;
	defaultFilters?: ContractorPayoutsInput;
	singlePage?: boolean;
};

export function DataTable({
	initialSettings,
	defaultFilters,
	singlePage,
	records = false,
}: Props) {
	const router = useRouter();
	const trpc = useTRPC();
	const { filters, hasFilters } = useContractorPayoutFilterParams();
	const { params } = useSortParams();
	const parentRef = useRef<HTMLDivElement>(null);
	const { ref: loadMoreRef, inView } = useInView({ rootMargin: "320px" });
	const [tableView, setTableView] = useState(false);
	const showRecords = records && !tableView;
	const { rowSelection, setRowSelection, setColumns, bindShowColumnDividers } =
		useContractorPayoutsTableStore();

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
		...(defaultFilters || {}),
		sort: params.sort,
	} as ContractorPayoutsInput;

	const infiniteQueryOptions = trpc.jobs.contractorPayouts.infiniteQueryOptions(
		queryInput,
		{
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		},
	);

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isFetchNextPageError,
	} = useSuspenseInfiniteQuery<ContractorPayoutsPage>(
		infiniteQueryOptions as never,
	);

	const tableData = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
	}, [data]);

	const table = useReactTable({
		data: tableData,
		getRowId: getContractorPayoutRowId,
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

	useEffect(() => {
		setColumns(table.getAllLeafColumns());
	}, [setColumns, table]);

	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, showColumnDividers, setShowColumnDividers]);

	useEffect(() => {
		if (
			inView &&
			!singlePage &&
			hasNextPage &&
			!isFetchingNextPage &&
			!isFetchNextPageError
		) {
			void fetchNextPage();
		}
	}, [
		inView,
		singlePage,
		hasNextPage,
		isFetchingNextPage,
		isFetchNextPageError,
		fetchNextPage,
	]);

	const loadMore =
		!singlePage && hasNextPage ? (
			<div ref={loadMoreRef} className="flex justify-center py-4">
				<Button
					variant="outline"
					disabled={isFetchingNextPage}
					onClick={() => void fetchNextPage()}
				>
					{isFetchingNextPage
						? "Loading payouts…"
						: isFetchNextPageError
							? "Retry loading payouts"
							: "Load more payouts"}
				</Button>
			</div>
		) : null;

	if (hasFilters && tableData.length === 0) {
		return <NoResults />;
	}

	if (tableData.length === 0) {
		return <EmptyState />;
	}

	if (showRecords) {
		return (
			<div className="relative min-w-0">
				<PaymentTableViewToggle tableView={tableView} onChange={setTableView} />
				<RecordList
					rows={rows}
					renderRow={(row) => (
						<PayoutRecord
							id={row.original.id}
							name={row.original.paidTo || "Unknown contractor"}
							amount={row.original.amount}
							createdAt={row.original.createdAt}
							paymentMethod={row.original.paymentMethod || "Unknown"}
							checkNo={row.original.checkNo}
							jobCount={row.original.jobCount}
							isCancelled={row.original.isCancelled}
							selection={
								<Checkbox
									aria-label={`Select payout ${row.id}`}
									checked={row.getIsSelected()}
									onCheckedChange={(checked) =>
										row.toggleSelected(checked === true)
									}
								/>
							}
						/>
					)}
				/>
				{loadMore}
				<AnimatePresence>
					{Object.values(rowSelection).some(Boolean) ? (
						<BottomBar data={tableData} />
					) : null}
				</AnimatePresence>
			</div>
		);
	}

	const showBottomBar = Object.keys(rowSelection).length > 0;

	return (
		<div className="relative min-w-0">
			{records ? (
				<PaymentTableViewToggle tableView={tableView} onChange={setTableView} />
			) : null}
			<div className="w-full">
				<div
					ref={(element) => {
						parentRef.current = element;
						tableScroll.containerRef.current = element;
					}}
					className="overflow-x-auto overflow-y-hidden border-b border-l border-r border-border"
				>
					<DndContext
						id="contractor-payouts-table-dnd"
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
									height: `${rows.length * tableConfig.rowHeight}px`,
									position: "relative",
								}}
							>
								{rows.map((row, index) => {
									return (
										<VirtualRow
											key={row.id}
											row={row}
											virtualStart={index * tableConfig.rowHeight}
											rowHeight={tableConfig.rowHeight}
											fillColumnId={tableConfig.fillColumnId}
											tableStyle={tableConfig.style}
											getStickyStyle={getStickyStyle}
											getStickyClassName={getStickyClassName}
											nonClickableColumns={NON_CLICKABLE_COLUMNS}
											onCellClick={(rowId) => {
												router.push(`/contractors/jobs/payments/${rowId}`);
											}}
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
			</div>

			{loadMore}
			<AnimatePresence>
				{showBottomBar ? <BottomBar data={tableData} /> : null}
			</AnimatePresence>
		</div>
	);
}
