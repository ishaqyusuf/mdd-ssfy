"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import type { saveUnitInvoiceFormSchema } from "@api/db/queries/unit-invoices";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Table, TableBody } from "@gnd/ui/table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";
import type { Control } from "react-hook-form";
import type { z } from "zod";

import {
	type UnitInvoiceTaskRow,
	columns,
	getUnitInvoiceTaskRowId,
} from "./columns";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["actions"]);
const TABLE_ID = "unit-invoice-form-tasks";
const COLUMN_IDS = getColumnIds(columns);
const tableConfig = TABLE_CONFIGS[TABLE_ID];
type UnitInvoiceFormValues = z.infer<typeof saveUnitInvoiceFormSchema>;
type LockedInputProps = {
	readOnly?: boolean;
	className?: string;
};
type CheckedState = boolean | "indeterminate";

type Props = {
	data: UnitInvoiceTaskRow[];
	control: Control<UnitInvoiceFormValues>;
	lockedInputProps?: LockedInputProps;
	deletePending: boolean;
	syncCheckNo: boolean;
	syncCheckDate: boolean;
	firstCheckNo: string;
	firstCheckDate: Date | null;
	initialSettings?: Partial<TableSettings>;
	onApplyFirstCheckNoToAll: (checked: CheckedState) => void;
	onApplyFirstCheckDateToAll: (checked: CheckedState) => void;
	onDeleteTask: (index: number) => void | Promise<void>;
};

export function DataTable({
	data,
	control,
	lockedInputProps,
	deletePending,
	syncCheckNo,
	syncCheckDate,
	firstCheckNo,
	firstCheckDate,
	initialSettings,
	onApplyFirstCheckNoToAll,
	onApplyFirstCheckDateToAll,
	onDeleteTask,
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

	const tableData = useMemo<UnitInvoiceTaskRow[]>(() => data, [data]);
	const table = useReactTable({
		data: tableData,
		getRowId: getUnitInvoiceTaskRowId,
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
			control,
			lockedInputProps,
			deletePending,
			syncCheckNo,
			syncCheckDate,
			firstCheckNo,
			firstCheckDate,
			onApplyFirstCheckNoToAll,
			onApplyFirstCheckDateToAll,
			onDeleteTask,
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
		overscan: 8,
	});

	const tableHeight = Math.min(
		360,
		Math.max(
			tableConfig.headerHeight + tableConfig.rowHeight * Math.max(rows.length, 1) + 2,
			140,
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
						id="unit-invoice-form-tasks-table-dnd"
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
