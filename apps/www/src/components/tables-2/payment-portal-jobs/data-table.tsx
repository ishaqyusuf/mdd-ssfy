"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Table, TableBody } from "@gnd/ui/table";
import {
	type RowSelectionState,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
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
}: Props) {
	const parentRef = useRef<HTMLDivElement>(null);
	const { setColumns, bindShowColumnDividers } =
		usePaymentPortalJobsTableStore();

	useScrollHeader(parentRef);

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

	if (isLoading) {
		return <PaymentPortalJobsSkeleton initialSettings={initialSettings} />;
	}

	if (tableData.length === 0) {
		return <EmptyState text={emptyText} />;
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
						height:
							"max(360px, calc(100vh - 420px + var(--header-offset, 0px)))",
					}}
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
					<div
						style={{
							height: "var(--header-offset, 0px)",
							flexShrink: 0,
						}}
						aria-hidden
					/>
				</div>
			</div>
		</div>
	);
}
