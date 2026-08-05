"use client";

import {
	InventoryShipAvailableDialog,
	type InventoryShipAvailableLine,
} from "@/components/inventory/inventory-ship-available-dialog";
import { VirtualRow } from "@/components/tables-2/core";
import { buildSalesOverviewUrl } from "@/hooks/sales-overview-open-params";
import { useAuth } from "@/hooks/use-auth";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useInventoryFulfillmentInvalidation } from "@/hooks/use-inventory-fulfillment-invalidation";
import { useInventoryPartialShipmentFilterParams } from "@/hooks/use-inventory-partial-shipment-filter-params";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { openLink } from "@/lib/open-link";
import { useTRPC } from "@/trpc/client";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Table, TableBody } from "@gnd/ui/table";
import { useMutation, useSuspenseInfiniteQuery } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import {
	type RowSelectionState,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BottomBar } from "./bottom-bar";
import {
	type InventoryPartialShipmentRow,
	type InventoryPartialShipmentTableActions,
	getInventoryPartialShipmentColumns,
	getInventoryPartialShipmentRowId,
} from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { useInventoryPartialShipmentsTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["select", "hold", "actions"]);
const TABLE_ID = "inventory-partial-shipments";
const tableConfig = TABLE_CONFIGS[TABLE_ID];

type Props = {
	initialSettings?: Partial<TableSettings>;
};

function getSalesOverviewUrl(orderId: string | null) {
	if (!orderId) return null;
	return buildSalesOverviewUrl(orderId, "dispatch-modal", {
		salesTab: "packing",
	});
}

export function DataTable({ initialSettings }: Props) {
	const trpc = useTRPC();
	const auth = useAuth();
	const invalidateInventoryFulfillment = useInventoryFulfillmentInvalidation();
	const { filters, hasFilters } = useInventoryPartialShipmentFilterParams();
	const parentRef = useRef<HTMLDivElement>(null);
	const [shipmentItem, setShipmentItem] =
		useState<InventoryShipAvailableLine | null>(null);
	const { rowSelection, setRowSelection, setColumns, bindShowColumnDividers } =
		useInventoryPartialShipmentsTableStore();
	const canManageFulfillment = Boolean(
		auth.can?.editOrders ||
			auth.can?.editPickup ||
			auth.can?.editDelivery ||
			auth.can?.viewPacking,
	);
	const setHold = useMutation(
		trpc.inventories.setSalesInventoryLineFulfillmentHold.mutationOptions({
			async onSuccess(data) {
				await invalidateInventoryFulfillment();
				toast({
					title: data.holdUntilComplete
						? "Line held until complete"
						: "Partial shipment allowed",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Hold could not be changed",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const holdingLineItemId = setHold.isPending
		? ((setHold.variables as { lineItemId?: number } | undefined)?.lineItemId ??
			null)
		: null;
	const actions = useMemo<InventoryPartialShipmentTableActions>(
		() => ({
			onToggleHold(item, holdUntilComplete) {
				if (!item.lineItemId) return;
				setHold.mutate({
					lineItemId: item.lineItemId,
					holdUntilComplete,
					note: holdUntilComplete
						? "Held from partial shipment screen."
						: "Partial shipment allowed from partial shipment screen.",
				});
			},
			onShipAvailable: setShipmentItem,
			canManageFulfillment,
			holdingLineItemId,
		}),
		[canManageFulfillment, holdingLineItemId, setHold.mutate],
	);
	const columns = useMemo(
		() => getInventoryPartialShipmentColumns(actions),
		[actions],
	);
	const columnIds = useMemo(() => getColumnIds(columns), [columns]);

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
		columnIds,
		showColumnDividers: true,
	});

	const infiniteQueryOptions =
		trpc.inventories.salesPartialShipmentQueue.infiniteQueryOptions(
			{ ...filters, limit: 50 },
			{
				getNextPageParam: (page) => page.nextCursorId ?? undefined,
			},
		);
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery(infiniteQueryOptions);
	const tableData = useMemo<InventoryPartialShipmentRow[]>(() => {
		const byId = new Map<string, InventoryPartialShipmentRow>();
		for (const page of data.pages) {
			for (const item of page.items) {
				byId.set(getInventoryPartialShipmentRowId(item), item);
			}
		}
		return Array.from(byId.values());
	}, [data.pages]);
	const table = useReactTable({
		data: tableData,
		getRowId: getInventoryPartialShipmentRowId,
		columns,
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
			rowSelection: rowSelection as RowSelectionState,
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
	useInfiniteScroll<HTMLDivElement>({
		scrollRef: parentRef,
		rowVirtualizer,
		rowCount: rows.length,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	});

	useEffect(() => {
		setColumns(table.getAllLeafColumns());
	}, [setColumns, table]);

	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, showColumnDividers, setShowColumnDividers]);

	const handleCellClick = useCallback((item: InventoryPartialShipmentRow) => {
		const overviewUrl = getSalesOverviewUrl(item.orderId);
		if (overviewUrl) {
			openLink(overviewUrl);
		}
	}, []);

	if (tableData.length === 0) {
		return hasFilters ? <NoResults /> : <EmptyState />;
	}

	const virtualItems = rowVirtualizer.getVirtualItems();

	return (
		<>
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
								"max(360px, calc(100vh - 430px + var(--header-offset, 0px)))",
						}}
					>
						<DndContext
							id="inventory-partial-shipments-table-dnd"
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
												onCellClick={() => handleCellClick(row.original)}
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
			<InventoryShipAvailableDialog
				item={shipmentItem}
				open={Boolean(shipmentItem)}
				onOpenChange={(open) => {
					if (!open) setShipmentItem(null);
				}}
			/>
			<BottomBar
				data={tableData}
				canManageFulfillment={canManageFulfillment}
				isHolding={setHold.isPending}
				onSetHold={(items, holdUntilComplete) => {
				void Promise.allSettled(
						items.flatMap((item) =>
							item.lineItemId
								? [
										setHold.mutateAsync({
											lineItemId: item.lineItemId,
											holdUntilComplete,
											note: "Bulk update from partial shipment screen.",
										}),
									]
								: [],
						),
					);
				}}
				onShip={(items) => {
					const first = items[0];
					if (!first?.salesOrderId || !first.lineItemId) return;
					const deliveryModes = new Set(items.map((item) => item.deliveryMode));
					setShipmentItem({
						salesOrderId: first.salesOrderId,
						lineItemId: first.lineItemId,
						lineItemIds: items.flatMap((item) =>
							item.lineItemId ? [item.lineItemId] : [],
						),
						orderId: first.orderId,
						title: `${items.length} selected inventory lines`,
						deliveryMode: deliveryModes.size === 1 ? first.deliveryMode : null,
						availableToShipQty: items.reduce(
							(total, item) => total + item.availableToShipQty,
							0,
						),
						remainingQty: items.reduce(
							(total, item) => total + item.remainingQty,
							0,
						),
						backorderedQty: items.reduce(
							(total, item) => total + item.backorderedQty,
							0,
						),
					});
				}}
			/>
		</>
	);
}
