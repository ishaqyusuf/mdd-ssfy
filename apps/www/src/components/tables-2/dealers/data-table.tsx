"use client";

import { TableSkeleton, VirtualRow } from "@/components/tables-2/core";
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
	type DealerRow,
	type SalesProfileOption,
	createDealerColumns,
	getDealerRowId,
} from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useDealersTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["profile", "actions"]);
const TABLE_ID = "dealers";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type Props = {
	dealers: DealerRow[];
	profiles: SalesProfileOption[];
	initialSettings?: Partial<TableSettings>;
	isLoading?: boolean;
	isProfilesLoading?: boolean;
	hasFilters?: boolean;
	updatingProfileDealerId?: number | null;
	resendingDealerId?: number | null;
	isResending?: boolean;
	onCreateDealer: () => void;
	onUpdateSalesProfile: (dealerId: number, profileId: number) => void;
	onResendOnboarding: (dealerId: number) => void;
};

export function DataTable({
	dealers,
	profiles,
	initialSettings,
	isLoading,
	isProfilesLoading,
	hasFilters,
	updatingProfileDealerId,
	resendingDealerId,
	isResending,
	onCreateDealer,
	onUpdateSalesProfile,
	onResendOnboarding,
}: Props) {
	const parentRef = useRef<HTMLDivElement>(null);
	const setColumns = useDealersTableStore((state) => state.setColumns);
	const bindShowColumnDividers = useDealersTableStore(
		(state) => state.bindShowColumnDividers,
	);

	useScrollHeader(parentRef);

	const columns = useMemo(
		() =>
			createDealerColumns({
				profiles,
				isProfilesLoading,
				updatingProfileDealerId,
				resendingDealerId,
				isResending,
				onUpdateSalesProfile,
				onResendOnboarding,
			}),
		[
			profiles,
			isProfilesLoading,
			updatingProfileDealerId,
			resendingDealerId,
			isResending,
			onUpdateSalesProfile,
			onResendOnboarding,
		],
	);
	const columnIds = useMemo(() => getColumnIds(columns), [columns]);

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
		tableId: "dealers",
		initialSettings,
		columnIds,
		showColumnDividers: true,
	});

	const table = useReactTable({
		data: dealers,
		getRowId: getDealerRowId,
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
		overscan: 10,
	});

	useEffect(() => {
		setColumns(table.getAllLeafColumns());
	}, [setColumns, table]);

	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, showColumnDividers, setShowColumnDividers]);

	if (isLoading) {
		return (
			<TableSkeleton
				columns={columns}
				columnVisibility={columnVisibility}
				columnSizing={columnSizing}
				columnOrder={columnOrder}
				tableConfig={tableConfig}
				rowCount={8}
			/>
		);
	}

	if (hasFilters && dealers.length === 0) {
		return <NoResults />;
	}

	if (dealers.length === 0) {
		return <EmptyState onCreateDealer={onCreateDealer} />;
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
						height: "calc(100vh - 280px + var(--header-offset, 0px))",
					}}
				>
					<DndContext
						id="dealers-table-dnd"
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
