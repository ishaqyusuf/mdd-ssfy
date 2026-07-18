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
import { useMemo, useRef } from "react";

import {
	type SalesFormHptLineRow,
	columns,
	getSalesFormHptLineRowId,
} from "./columns";
import { DataTableHeader } from "./table-header";

export type { SalesFormHptLineRow } from "./columns";

const TABLE_ID = "sales-form-hpt-lines";
const COLUMN_IDS = getColumnIds(columns);
const tableConfig = TABLE_CONFIGS[TABLE_ID];
const NON_CLICKABLE_COLUMNS = new Set([
	"sn",
	"size",
	"production",
	"swing",
	"qty",
	"lh",
	"rh",
	"estimate",
	"total",
	"actions",
]);

type Props = {
	data: SalesFormHptLineRow[];
	isSlab: boolean;
	showSwing: boolean;
	noHandle: boolean;
	initialSettings?: Partial<TableSettings>;
};

export function DataTable({
	data,
	isSlab,
	showSwing,
	noHandle,
	initialSettings,
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

	const tableData = useMemo<SalesFormHptLineRow[]>(() => data, [data]);
	const effectiveColumnVisibility = useMemo(
		() => ({
			...columnVisibility,
			production: isSlab && columnVisibility.production !== false,
			swing: showSwing && columnVisibility.swing !== false,
			qty: noHandle && columnVisibility.qty !== false,
			lh: !noHandle && columnVisibility.lh !== false,
			rh: !noHandle && columnVisibility.rh !== false,
		}),
		[columnVisibility, isSlab, noHandle, showSwing],
	);
	const table = useReactTable({
		data: tableData,
		getRowId: getSalesFormHptLineRowId,
		columns,
		getCoreRowModel: getCoreRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		enableColumnResizing: true,
		columnResizeMode: "onChange",
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		state: {
			columnVisibility: effectiveColumnVisibility,
			columnSizing,
			columnOrder,
		},
	});

	const { getStickyStyle, getStickyClassName } = useStickyColumns({
		columnVisibility: effectiveColumnVisibility,
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

	const tableHeight = Math.min(
		360,
		Math.max(
			tableConfig.headerHeight +
				tableConfig.rowHeight * Math.max(rows.length, 1) +
				2,
			128,
		),
	);
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
					style={{ height: tableHeight }}
				>
					<DndContext
						id="sales-form-hpt-lines-table-dnd"
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
											columnSizing={columnSizing}
											columnOrder={columnOrder}
											columnVisibility={effectiveColumnVisibility}
											showColumnDividers={showColumnDividers}
											rowClassName={() => "cursor-default"}
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
