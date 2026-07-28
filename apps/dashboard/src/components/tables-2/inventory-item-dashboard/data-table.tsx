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
	type Column,
	type ColumnDef,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";

import { EmptyState } from "./empty-states";
import { useInventoryItemDashboardTableStore } from "./store";
import { DataTableHeader } from "./table-header";
import type { InventoryItemDashboardTableId } from "./types";

const NON_CLICKABLE_COLUMNS = new Set(["actions"]);

type Props<TData> = {
	tableId: InventoryItemDashboardTableId;
	data: TData[];
	columns: ColumnDef<TData>[];
	getRowId: (row: TData, index: number) => string;
	emptyTitle: string;
	emptyDescription: string;
	initialSettings?: Partial<TableSettings>;
	height?: string;
	dndId: string;
};

export function InventoryItemDashboardDataTable<TData>({
	tableId,
	data,
	columns,
	getRowId,
	emptyTitle,
	emptyDescription,
	initialSettings,
	height,
	dndId,
}: Props<TData>) {
	const parentRef = useRef<HTMLDivElement>(null);
	const tableConfig = TABLE_CONFIGS[tableId];
	const { setColumns, bindShowColumnDividers } =
		useInventoryItemDashboardTableStore();

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
		tableId,
		initialSettings,
		columnIds: getColumnIds(columns),
		showColumnDividers: true,
	});

	const tableData = useMemo<TData[]>(() => data, [data]);
	const table = useReactTable({
		data: tableData,
		getRowId,
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
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => tableConfig.rowHeight,
		overscan: 6,
	});

	useEffect(() => {
		setColumns(
			tableId,
			table.getAllLeafColumns() as Column<unknown, unknown>[],
		);
	}, [setColumns, table, tableId]);

	useEffect(() => {
		bindShowColumnDividers(tableId, showColumnDividers, setShowColumnDividers);
	}, [
		bindShowColumnDividers,
		showColumnDividers,
		setShowColumnDividers,
		tableId,
	]);

	if (tableData.length === 0) {
		return <EmptyState title={emptyTitle} description={emptyDescription} />;
	}

	const virtualItems = rowVirtualizer.getVirtualItems();
	const tableHeight =
		height ??
		`${tableConfig.headerHeight + Math.max(1, Math.min(rows.length, 5)) * tableConfig.rowHeight}px`;

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
						height: tableHeight,
					}}
				>
					<DndContext
						id={dndId}
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<Table className="w-full min-w-full">
							<DataTableHeader
								table={table}
								tableId={tableId}
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
