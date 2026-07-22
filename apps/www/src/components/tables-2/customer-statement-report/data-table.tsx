"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { cn } from "@/lib/utils";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Table, TableBody } from "@gnd/ui/table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";

import {
	type CustomerStatementReportRow,
	type CustomerStatementReportTableMeta,
	columns,
	getCustomerStatementReportRowId,
} from "./columns";
import { EmptyState } from "./empty-states";
import { CustomerStatementReportSkeleton } from "./skeleton";
import { DataTableHeader } from "./table-header";

const TABLE_ID = "customer-statement-report";
const COLUMN_IDS = getColumnIds(columns);
const tableConfig = TABLE_CONFIGS[TABLE_ID];
const NON_CLICKABLE_COLUMNS = new Set(["actions"]);

type Props = {
	data: CustomerStatementReportRow[];
	initialSettings?: Partial<TableSettings>;
	isLoading?: boolean;
	className?: string;
	emptyDescription: string;
	footerDueOrders: number;
	footerDueAmount: string;
	onOpenCustomer: (customerId: number | null) => void;
};

export function DataTable({
	data,
	initialSettings,
	isLoading,
	className,
	emptyDescription,
	footerDueOrders,
	footerDueAmount,
	onOpenCustomer,
}: Props) {
	const parentRef = useRef<HTMLDivElement>(null);

	useScrollHeader(parentRef);

	const {
		columnVisibility,
		setColumnVisibility,
		columnSizing,
		setColumnSizing,
		columnOrder,
		setColumnOrder,
		showColumnDividers,
	} = useTableSettings({
		tableId: TABLE_ID,
		initialSettings,
		columnIds: COLUMN_IDS,
		showColumnDividers: true,
	});

	const tableData = useMemo<CustomerStatementReportRow[]>(() => data, [data]);
	const table = useReactTable({
		data: tableData,
		getRowId: getCustomerStatementReportRowId,
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
		meta: {
			onOpenCustomer,
		} satisfies CustomerStatementReportTableMeta,
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
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => tableConfig.rowHeight,
		overscan: 8,
	});

	if (isLoading) {
		return (
			<CustomerStatementReportSkeleton
				initialSettings={initialSettings}
				className={className}
			/>
		);
	}

	if (tableData.length === 0) {
		return (
			<div className={cn("min-h-0", className)}>
				<EmptyState description={emptyDescription} />
			</div>
		);
	}

	const virtualItems = rowVirtualizer.getVirtualItems();

	return (
		<div className={cn("relative flex min-h-0 flex-col", className)}>
			<div
				ref={(element) => {
					parentRef.current = element;
					tableScroll.containerRef.current = element;
				}}
				className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-t-md border border-border scrollbar-hide"
			>
				<DndContext
					id="customer-statement-report-table-dnd"
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
										onCellClick={() => onOpenCustomer(row.original.customerId)}
										columnSizing={columnSizing}
										columnOrder={columnOrder}
										columnVisibility={columnVisibility}
										showColumnDividers={showColumnDividers}
										rowClassName={() =>
											row.original.customerId
												? "cursor-pointer"
												: "cursor-default"
										}
									/>
								);
							})}
						</TableBody>
					</Table>
				</DndContext>
			</div>
			<div className="grid grid-cols-[minmax(0,1fr)_96px_124px_128px_64px] items-center rounded-b-md border-x border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
				<span>TOTAL:</span>
				<span className="text-right tabular-nums">{footerDueOrders}</span>
				<span className="text-right tabular-nums">{footerDueAmount}</span>
				<span />
				<span />
			</div>
		</div>
	);
}
