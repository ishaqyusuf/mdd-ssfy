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
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";

import {
	type CustomerSalesWorkspaceRow,
	columns,
	getCustomerSalesWorkspaceRowId,
} from "./columns";
import { EmptyState } from "./empty-states";
import { CustomerSalesWorkspaceSkeleton } from "./skeleton";
import { useCustomerSalesWorkspaceTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["select", "actions"]);
const TABLE_ID = "customer-sales-workspace";
const COLUMN_IDS = getColumnIds(columns);
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type Props = {
	data: CustomerSalesWorkspaceRow[];
	initialSettings?: Partial<TableSettings>;
	isLoading?: boolean;
	selectedIds: number[];
	onToggleAll: (checked: boolean) => void;
	onToggleRow: (item: CustomerSalesWorkspaceRow, checked: boolean) => void;
	onOpenRow: (item: CustomerSalesWorkspaceRow) => void;
	onDeleted: (item: CustomerSalesWorkspaceRow) => void;
};

export function DataTable({
	data,
	initialSettings,
	isLoading,
	selectedIds,
	onToggleAll,
	onToggleRow,
	onOpenRow,
	onDeleted,
}: Props) {
	const parentRef = useRef<HTMLDivElement>(null);
	const { setColumns, bindShowColumnDividers } =
		useCustomerSalesWorkspaceTableStore();

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
		tableId: TABLE_ID,
		initialSettings,
		columnIds: COLUMN_IDS,
		showColumnDividers: true,
	});

	const tableData = useMemo<CustomerSalesWorkspaceRow[]>(() => data, [data]);
	const rowById = useMemo(
		() =>
			new Map(
				tableData.map((row) => [getCustomerSalesWorkspaceRowId(row), row]),
			),
		[tableData],
	);
	const selectedVisibleCount = useMemo(
		() => tableData.filter((item) => selectedIds.includes(item.id)).length,
		[tableData, selectedIds],
	);
	const table = useReactTable({
		data: tableData,
		getRowId: getCustomerSalesWorkspaceRowId,
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
			selectedIds,
			isAllRowsSelected:
				tableData.length > 0 && selectedVisibleCount === tableData.length,
			isSomeRowsSelected:
				selectedVisibleCount > 0 && selectedVisibleCount < tableData.length,
			onToggleAll,
			onToggleRow,
			onDeleted,
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
		overscan: 8,
	});

	useEffect(() => {
		setColumns(table.getAllLeafColumns());
	}, [setColumns, table]);

	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, showColumnDividers, setShowColumnDividers]);

	if (isLoading) {
		return <CustomerSalesWorkspaceSkeleton initialSettings={initialSettings} />;
	}

	if (tableData.length === 0) {
		return <EmptyState />;
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
							"clamp(260px, calc(100vh - 430px + var(--header-offset, 0px)), 460px)",
					}}
				>
					<DndContext
						id="customer-sales-workspace-table-dnd"
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
											onCellClick={(rowId) => {
												const item = rowById.get(rowId);
												if (item) onOpenRow(item);
											}}
											columnSizing={columnSizing}
											columnOrder={columnOrder}
											columnVisibility={columnVisibility}
											showColumnDividers={showColumnDividers}
											rowClassName={(item) =>
												selectedIds.includes(item.original.id)
													? "bg-muted hover:bg-muted"
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
		</div>
	);
}
