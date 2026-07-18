"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { useTRPC } from "@/trpc/client";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Table, TableBody } from "@gnd/ui/table";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";

import {
	type PackingListRow,
	type PackingListStatus,
	type PackingListTab,
	columns,
	getPackingListRowId,
} from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { usePackingListTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["actions"]);
const TABLE_ID = "packing-list";
const COLUMN_IDS = getColumnIds(columns);
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type PackingListInput = RouterInputs["dispatch"]["packingList"];

type Props = {
	initialSettings?: Partial<TableSettings>;
	tab: PackingListTab;
	searchTerm?: string;
	isAdmin: boolean;
	isEnabled?: boolean;
	isUpdatingDispatchId?: number | null;
	onClearSearch?: () => void;
	onOpen: (item: PackingListRow) => void;
	onStatusChange: (item: PackingListRow, status: PackingListStatus) => void;
};

function normalize(value?: string | null) {
	return String(value || "").toLowerCase();
}

export function DataTable({
	initialSettings,
	tab,
	searchTerm,
	isAdmin,
	isEnabled = true,
	isUpdatingDispatchId,
	onClearSearch,
	onOpen,
	onStatusChange,
}: Props) {
	const trpc = useTRPC();
	const parentRef = useRef<HTMLDivElement>(null);
	const { setColumns, bindShowColumnDividers } = usePackingListTableStore();

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

	const queryInput = { tab } satisfies PackingListInput;
	const { data } = useSuspenseQuery(
		trpc.dispatch.packingList.queryOptions(queryInput, {
			enabled: isEnabled,
		}),
	);

	const term = normalize(searchTerm).trim();
	const tableData = useMemo(() => {
		const rows = data ?? [];
		if (!term) return rows;

		return rows.filter((item) =>
			[item.orderNo, item.salesRep, item.customerName, item.address, item.phone]
				.map((value) => normalize(value))
				.some((value) => value.includes(term)),
		);
	}, [data, term]);

	const table = useReactTable({
		data: tableData,
		getRowId: getPackingListRowId,
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
			tab,
			isAdmin,
			isUpdatingDispatchId,
			onOpen,
			onStatusChange,
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
		overscan: 10,
	});

	useEffect(() => {
		setColumns(table.getAllLeafColumns());
	}, [setColumns, table]);

	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, showColumnDividers, setShowColumnDividers]);

	if (term && tableData.length === 0) {
		return <NoResults onClear={onClearSearch ?? (() => undefined)} />;
	}

	if (tableData.length === 0) {
		return <EmptyState tab={tab} />;
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
						height: "calc(100vh - 350px + var(--header-offset, 0px))",
					}}
				>
					<DndContext
						id="packing-list-table-dnd"
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
											onCellClick={() => onOpen(row.original)}
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
