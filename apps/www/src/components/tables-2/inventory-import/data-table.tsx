"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import { Table, TableBody } from "@gnd/ui/table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";

import {
	type InventoryImportRow,
	columns,
	getInventoryImportRowId,
} from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useInventoryImportTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set([
	"category",
	"scope",
	"importStatus",
	"productCount",
	"importedRows",
]);
const COLUMN_IDS = getColumnIds(columns);
const TABLE_ID = "inventory-import";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type Props = {
	data?: InventoryImportRow[];
	hasFilters?: boolean;
	onClearFilters: () => void;
	onShowAllScopes: () => void;
	initialSettings?: Partial<TableSettings>;
};

export function DataTable({
	data = [],
	hasFilters,
	onClearFilters,
	onShowAllScopes,
	initialSettings,
}: Props) {
	const parentRef = useRef<HTMLDivElement>(null);
	const setColumns = useInventoryImportTableStore((state) => state.setColumns);
	const bindShowColumnDividers = useInventoryImportTableStore(
		(state) => state.bindShowColumnDividers,
	);

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
		tableId: "inventory-import",
		initialSettings,
		columnIds: COLUMN_IDS,
		showColumnDividers: true,
	});

	const table = useReactTable({
		data,
		getRowId: getInventoryImportRowId,
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
	const tableScroll = useTableScroll({
		useColumnWidths: true,
		startFromColumn: 1,
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

	if (hasFilters && data.length === 0) {
		return <NoResults onClear={onClearFilters} />;
	}

	if (data.length === 0) {
		return <EmptyState onShowAllScopes={onShowAllScopes} />;
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
							"min(520px, calc(100vh - 260px + var(--header-offset, 0px)))",
					}}
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
				</div>
			</div>
		</div>
	);
}
