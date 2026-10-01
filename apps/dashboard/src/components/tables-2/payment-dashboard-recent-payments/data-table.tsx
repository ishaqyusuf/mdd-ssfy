"use client";

import { PaymentTableViewToggle } from "@/components/payment-dashboard/payment-table-view-toggle";
import { PayoutRecord } from "@/components/payment-dashboard/payout-record";
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
import { Table, TableBody } from "@gnd/ui/table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
	type PaymentDashboardRecentPaymentRow,
	columns,
	getPaymentDashboardRecentPaymentRowId,
} from "./columns";
import { EmptyState } from "./empty-states";
import { PaymentDashboardRecentPaymentsSkeleton } from "./skeleton";
import { usePaymentDashboardRecentPaymentsTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["actions"]);
const TABLE_ID = "payment-dashboard-recent-payments";
const COLUMN_IDS = getColumnIds(columns);
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type Props = {
	records?: boolean;
	data: PaymentDashboardRecentPaymentRow[];
	initialSettings?: Partial<TableSettings>;
	isLoading?: boolean;
};

export function DataTable({
	data,
	initialSettings,
	isLoading,
	records = false,
}: Props) {
	const router = useRouter();
	const parentRef = useRef<HTMLDivElement>(null);
	const [tableView, setTableView] = useState(false);
	const showRecords = records && !tableView;
	const { setColumns, bindShowColumnDividers } =
		usePaymentDashboardRecentPaymentsTableStore();

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

	const tableData = useMemo<PaymentDashboardRecentPaymentRow[]>(
		() => data,
		[data],
	);
	const table = useReactTable({
		data: tableData,
		getRowId: getPaymentDashboardRecentPaymentRowId,
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
	const { sensors, handleDragEnd } = useTableDnd(table);
	const tableScroll = useTableScroll({
		useColumnWidths: true,
		startFromColumn: 1,
	});
	const rows = table.getRowModel().rows;

	useEffect(() => {
		setColumns(table.getAllLeafColumns());
	}, [setColumns, table]);

	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, showColumnDividers, setShowColumnDividers]);

	if (isLoading) {
		if (showRecords) return <RecordListSkeleton />;
		return (
			<PaymentDashboardRecentPaymentsSkeleton
				initialSettings={initialSettings}
			/>
		);
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
							name={row.original.contractor || "Unknown contractor"}
							amount={row.original.amount}
							createdAt={row.original.createdAt}
							paymentMethod={row.original.paymentMethod || "Unknown"}
							checkNo={row.original.checkNo}
							jobCount={row.original.jobCount}
						/>
					)}
				/>
			</div>
		);
	}

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
					className="overflow-x-auto border-b border-l border-r border-border"
				>
					<DndContext
						id="payment-dashboard-recent-payments-table-dnd"
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
										/>
									);
								})}
							</TableBody>
						</Table>
					</DndContext>
				</div>
			</div>
		</div>
	);
}
