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
	type NotificationChannelRow,
	type NotificationChannelsTableMeta,
	columns,
	getNotificationChannelRowId,
} from "./columns";
import { EmptyState, ErrorState, NoResults } from "./empty-states";
import { NotificationChannelsSkeleton } from "./skeleton";
import { useNotificationChannelsTableStore } from "./store";
import { DataTableHeader } from "./table-header";

export type { NotificationChannelRow };

const NON_CLICKABLE_COLUMNS = new Set(["actions"]);
const TABLE_ID = "notification-channels";
const COLUMN_IDS = getColumnIds(columns);
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type Props = {
	data: NotificationChannelRow[];
	error?: unknown;
	hasSearch?: boolean;
	initialSettings?: Partial<TableSettings>;
	isLoading?: boolean;
	selectedId?: number | null;
	onClearSearch: () => void;
	onSelectChannel: (row: NotificationChannelRow) => void | Promise<void>;
};

export function DataTable({
	data,
	error,
	hasSearch,
	initialSettings,
	isLoading,
	selectedId,
	onClearSearch,
	onSelectChannel,
}: Props) {
	const parentRef = useRef<HTMLDivElement>(null);
	const { setColumns, bindShowColumnDividers } =
		useNotificationChannelsTableStore();

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

	const tableData = useMemo<NotificationChannelRow[]>(() => data, [data]);
	const table = useReactTable({
		data: tableData,
		getRowId: getNotificationChannelRowId,
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
			selectedId,
			onSelectChannel,
		} satisfies NotificationChannelsTableMeta,
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

	useEffect(() => {
		setColumns(table.getAllLeafColumns());
	}, [setColumns, table]);

	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, showColumnDividers, setShowColumnDividers]);

	if (isLoading) {
		return <NotificationChannelsSkeleton initialSettings={initialSettings} />;
	}

	if (error) {
		return <ErrorState error={error} />;
	}

	if (hasSearch && tableData.length === 0) {
		return <NoResults onClear={onClearSearch} />;
	}

	if (tableData.length === 0) {
		return <EmptyState />;
	}

	const virtualItems = rowVirtualizer.getVirtualItems();

	return (
		<div className="relative h-full">
			<div className="h-full w-full">
				<div
					ref={(element) => {
						parentRef.current = element;
						tableScroll.containerRef.current = element;
					}}
					className="h-full overflow-auto overscroll-contain border-b border-l border-r border-border scrollbar-hide"
				>
					<DndContext
						id="notification-channels-table-dnd"
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
											isSelected={row.original.id === selectedId}
											rowClassName={(currentRow) =>
												currentRow.original.id === selectedId
													? "bg-primary/5 hover:bg-primary/10"
													: ""
											}
											onCellClick={(rowId) => {
												const channel = tableData.find(
													(item) => getNotificationChannelRowId(item) === rowId,
												);
												if (channel) {
													void onSelectChannel(channel);
												}
											}}
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
