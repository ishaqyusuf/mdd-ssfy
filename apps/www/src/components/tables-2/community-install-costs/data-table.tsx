"use client";

import { VirtualRow } from "@/components/tables-2/core";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { TABLE_CONFIGS } from "@/utils/table-configs";
import { type TableSettings, getColumnIds } from "@/utils/table-settings";
import { INSTALL_COST_DEFAULT_UNITS } from "@community/constants";
import {
	type CommunityInstallCostRateSchema,
	communityInstallCostRateSchema,
} from "@community/schema";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Table, TableBody } from "@gnd/ui/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import {
	type CommunityInstallCostRow,
	type CommunityInstallCostTableRow,
	columns,
	getCommunityInstallCostRowId,
} from "./columns";
import { EmptyState } from "./empty-states";
import { CommunityInstallCostsSkeleton } from "./skeleton";
import { useCommunityInstallCostsTableStore } from "./store";
import { DataTableHeader } from "./table-header";

const NON_CLICKABLE_COLUMNS = new Set(["actions"]);
const TABLE_ID = "community-install-costs";
const COLUMN_IDS = getColumnIds(columns);
const tableConfig = TABLE_CONFIGS[TABLE_ID];

const DRAFT_ROW: CommunityInstallCostTableRow = {
	id: -1,
	title: "",
	unit: "PCS",
	unitCost: 0,
	isDraft: true,
};

type Props = {
	data: CommunityInstallCostRow[];
	initialSettings?: Partial<TableSettings>;
	isLoading?: boolean;
	editIndex: number | null;
	setEditIndex: Dispatch<SetStateAction<number | null>>;
};

function getFormValues(
	row?: CommunityInstallCostTableRow | null,
): CommunityInstallCostRateSchema {
	return {
		id: row?.id && row.id !== -1 ? row.id : null,
		title: row?.title ?? "",
		unit: row?.unit ?? "PCS",
		unitCost: Number(row?.unitCost ?? 0),
		status: "active",
	};
}

export function DataTable({
	data,
	initialSettings,
	isLoading,
	editIndex,
	setEditIndex,
}: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const parentRef = useRef<HTMLDivElement>(null);
	const [customUnit, setCustomUnit] = useState("");
	const { setColumns, bindShowColumnDividers } =
		useCommunityInstallCostsTableStore();

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

	const form = useZodForm(communityInstallCostRateSchema, {
		defaultValues: getFormValues(DRAFT_ROW),
	});
	const { data: unitsList } = useQuery(
		trpc.community.getInstallCostRateUnits.queryOptions(),
	);
	const { mutate: saveRate, isPending: isSaving } = useMutation(
		trpc.community.updateInstallCostRate.mutationOptions({
			onSuccess() {
				setEditIndex(null);
				queryClient.invalidateQueries({
					queryKey: trpc.community.getCommunityInstallCostRates.queryKey(),
				});
			},
			meta: {
				debug: true,
				toastTitle: {
					error: "Unable to update",
					loading: "Updating...",
					success: "Updated!.",
				},
			},
		}),
	);

	const tableData = useMemo<CommunityInstallCostTableRow[]>(() => {
		if (editIndex === -1) return [DRAFT_ROW, ...data];

		return data;
	}, [data, editIndex]);
	const editingRow = useMemo(() => {
		if (editIndex === -1) return DRAFT_ROW;
		if (editIndex == null) return null;

		return tableData.find((row) => row.id === editIndex) ?? null;
	}, [editIndex, tableData]);
	const unitOptions = useMemo(() => {
		return Array.from(
			new Set(
				[customUnit, ...(unitsList ?? INSTALL_COST_DEFAULT_UNITS)]
					.filter(Boolean)
					.map((unit) => String(unit).toUpperCase()),
			),
		);
	}, [customUnit, unitsList]);

	useEffect(() => {
		if (!editingRow) return;

		const values = getFormValues(editingRow);
		form.reset(values);
		setCustomUnit(values.unit ?? "");
	}, [editingRow, form]);

	const table = useReactTable({
		data: tableData,
		getRowId: getCommunityInstallCostRowId,
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
			editingId: editIndex,
			form,
			unitOptions,
			isSaving,
			onEdit: (row) => setEditIndex(row.id),
			onCancel: () => setEditIndex(null),
			onSave: () => {
				void form.handleSubmit((values) => {
					saveRate(values);
				})();
			},
			setCustomUnit,
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

	useEffect(() => {
		setColumns(table.getAllLeafColumns());
	}, [setColumns, table]);

	useEffect(() => {
		bindShowColumnDividers(showColumnDividers, setShowColumnDividers);
	}, [bindShowColumnDividers, showColumnDividers, setShowColumnDividers]);

	if (isLoading) {
		return <CommunityInstallCostsSkeleton initialSettings={initialSettings} />;
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
							"clamp(260px, calc(100vh - 300px + var(--header-offset, 0px)), 560px)",
					}}
				>
					<DndContext
						id="community-install-costs-table-dnd"
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
											rowClassName={(currentRow) =>
												currentRow.original.id === editIndex
													? "bg-primary/5 hover:bg-primary/5"
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
