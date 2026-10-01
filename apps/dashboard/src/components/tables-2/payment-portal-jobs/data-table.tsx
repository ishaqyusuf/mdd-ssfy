"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { RecordList } from "@/components/tables-2/core/record-list";
import { RecordListSkeleton } from "@/components/tables-2/core/record-list-skeleton";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Button } from "@gnd/ui/button";
import { Table, TableBody } from "@gnd/ui/table";
import {
	type RowSelectionState,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef } from "react";

import {
	type PaymentPortalJobRow,
	createColumns,
	getPaymentPortalJobRowId,
} from "./columns";
import { EmptyState } from "./empty-states";
import { PaymentPortalJobsSkeleton } from "./skeleton";
import { usePaymentPortalJobsTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"]);
const TABLE_ID = "payment-portal-jobs";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type Props = {
	readOnly?: boolean;
	data: PaymentPortalJobRow[];
	emptyText: string;
	initialSettings?: Partial<TableSettings>;
	isLoading?: boolean;
	isPendingReviewMode: boolean;
	isReviewPending: boolean;
	rowSelection: RowSelectionState;
	setRowSelection: Dispatch<SetStateAction<RowSelectionState>>;
	onOpen: (job: PaymentPortalJobRow) => void;
	onMarkSubmitted: (jobId: number) => void;
	onApprove: (jobId: number) => void;
	onReject: (jobId: number) => void;
};

export function DataTable({
	data,
	emptyText,
	initialSettings,
	isLoading,
	isPendingReviewMode,
	isReviewPending,
	rowSelection,
	setRowSelection,
	onOpen,
	onMarkSubmitted,
	onApprove,
	onReject,
	readOnly = false,
}: Props) {
	const parentRef = useRef<HTMLDivElement>(null);
	const { setColumns, bindShowColumnDividers } =
		usePaymentPortalJobsTableStore();

	const tableColumns = useMemo(
		() =>
			createColumns({
				isPendingReviewMode,
				isReviewPending,
				onMarkSubmitted,
				onApprove,
				onReject,
			}),
		[
			isPendingReviewMode,
			isReviewPending,
			onMarkSubmitted,
			onApprove,
			onReject,
		],
	);
	const columnIds = useMemo(() => getColumnIds(tableColumns), [tableColumns]);

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

	const tableData = useMemo<PaymentPortalJobRow[]>(() => data, [data]);
	const table = useReactTable({
		data: tableData,
		getRowId: getPaymentPortalJobRowId,
		columns: tableColumns,
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

	useEffect(() => {
		setColumns(table.getAllLeafColumns());
	}, [setColumns, table]);

	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, showColumnDividers, setShowColumnDividers]);

	if (isLoading) {
		return (
			<>
				<div className={readOnly ? undefined : "md:hidden"}>
					<RecordListSkeleton />
				</div>
				{!readOnly ? (
					<div className="hidden md:block">
						<PaymentPortalJobsSkeleton initialSettings={initialSettings} />
					</div>
				) : null}
			</>
		);
	}

	if (tableData.length === 0) {
		return <EmptyState text={emptyText} />;
	}

	const records = (
		<div className="relative min-w-0">
			<RecordList
				rows={rows}
				renderRow={(row) => {
					const cell = (id: string) => {
						const value = row
							.getAllCells()
							.find((item) => item.column.id === id);
						return value
							? flexRender(value.column.columnDef.cell, value.getContext())
							: null;
					};
					return (
						<div className="min-w-0 space-y-3 p-4">
							<div className="flex min-w-0 items-start gap-3">
								{!readOnly ? (
									<div className="flex min-h-10 shrink-0 items-center">
										{cell("select")}
									</div>
								) : null}
								<div className="min-w-0 flex-1">
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">{cell("job")}</div>
										<div className="shrink-0">{cell("amount")}</div>
									</div>
									<div className="mt-2 min-w-0">{cell("details")}</div>
									<div className="mt-2 min-w-0 text-xs text-muted-foreground">
										{cell("project")}
									</div>
								</div>
							</div>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="flex min-w-0 flex-wrap items-center gap-2">
									{cell("status")}
									<span className="text-xs text-muted-foreground">
										{row.original.paymentStage === "ready-to-pay"
											? "Ready to pay"
											: "Auto-approve on payout"}
									</span>
								</div>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => onOpen(row.original)}
								>
									View job
								</Button>
							</div>
							{!readOnly ? (
								<div className="flex flex-wrap justify-end gap-2">
									{cell("actions")}
								</div>
							) : null}
						</div>
					);
				}}
			/>
		</div>
	);
	if (readOnly) return records;

	return (
		<div className="relative min-w-0">
			<div className="md:hidden">{records}</div>
			<div className="hidden min-w-0 md:block">
				<div className="w-full">
					<div
						ref={(element) => {
							parentRef.current = element;
							tableScroll.containerRef.current = element;
						}}
						className="overflow-x-auto border-b border-l border-r border-border"
					>
						<DndContext
							id="payment-portal-jobs-table-dnd"
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
												onCellClick={() => {
													onOpen(row.original);
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
			</div>
		</div>
	);
}
