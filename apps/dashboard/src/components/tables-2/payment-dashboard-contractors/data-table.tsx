"use client";

import { PaymentTableViewToggle } from "@/components/payment-dashboard/payment-table-view-toggle";
import { VirtualRow } from "@/components/tables-2/core";
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
import { ContractorTaskQueues } from "./task-queues";

import {
	type PaymentDashboardContractorRow,
	columns,
	getPaymentDashboardContractorRowId,
} from "./columns";
import { EmptyState } from "./empty-states";
import { PaymentDashboardContractorsSkeleton } from "./skeleton";
import { usePaymentDashboardContractorsTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["actions"]);
const TABLE_ID = "payment-dashboard-contractors";
const COLUMN_IDS = getColumnIds(columns);
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type Props = {
	tasks?: boolean;
	data: PaymentDashboardContractorRow[];
	initialSettings?: Partial<TableSettings>;
	isLoading?: boolean;
};

export function DataTable({
	data,
	initialSettings,
	isLoading,
	tasks = false,
}: Props) {
	const router = useRouter();
	const parentRef = useRef<HTMLDivElement>(null);
	const [tableView, setTableView] = useState(false);
	const { setColumns, bindShowColumnDividers } =
		usePaymentDashboardContractorsTableStore();

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

	const tableData = useMemo<PaymentDashboardContractorRow[]>(
		() => data,
		[data],
	);
	const table = useReactTable({
		data: tableData,
		getRowId: getPaymentDashboardContractorRowId,
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
		if (tasks && !tableView) return <RecordListSkeleton />;
		return (
			<PaymentDashboardContractorsSkeleton initialSettings={initialSettings} />
		);
	}

	if (tableData.length === 0) {
		return <EmptyState />;
	}

	if (tasks && !tableView)
		return (
			<div className="min-w-0">
				<PaymentTableViewToggle tableView={tableView} onChange={setTableView} />
				<ContractorTaskQueues rows={rows} />
			</div>
		);

	return (
		<div className="relative min-w-0">
			{tasks ? (
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
						id="payment-dashboard-contractors-table-dnd"
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
												router.push(
													`/contractors/jobs/payment-portal?contractorId=${rowId}`,
												);
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
