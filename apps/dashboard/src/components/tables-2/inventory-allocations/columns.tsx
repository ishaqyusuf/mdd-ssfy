"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type InventoryAllocationRow =
	RouterOutputs["inventories"]["pendingAllocations"]["data"][number];

export type InventoryAllocationTableActions = {
	onApprove: (allocationId: number) => void;
	onReject: (allocationId: number) => void;
	isApproving?: boolean;
	isRejecting?: boolean;
};

type Column = ColumnDef<InventoryAllocationRow>;

function formatQty(value: number | string | null | undefined) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "No date";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatStatus(value: string | null | undefined) {
	return value ? value.replaceAll("_", " ") : "unknown";
}

function getOrderOverviewUrl(orderId: string | null | undefined) {
	if (!orderId) return null;

	const params = new URLSearchParams({
		"sales-overview-id": orderId,
		"sales-type": "order",
		mode: "sales",
		salesTab: "inventory",
	});

	return `/sales-book/orders?${params.toString()}`;
}

export function getInventoryAllocationRowId(row: InventoryAllocationRow) {
	return String(row.id);
}

const selectColumn: Column = {
	id: "select",
	...sizes.custom(50, 50),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		className: sizeClass(
			sizes.custom(50, 50),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
	},
	cell: ({ row }) => (
		<Checkbox
			aria-label={`Select allocation ${row.original.id}`}
			checked={row.getIsSelected()}
			onCheckedChange={(checked) => {
				if (checked === "indeterminate") {
					row.toggleSelected();
				} else {
					row.toggleSelected(checked);
				}
			}}
			onClick={(event) => event.stopPropagation()}
		/>
	),
};

const inventoryColumn: Column = {
	id: "inventory",
	header: "Inventory",
	accessorFn: (row) => row.inventoryVariant?.inventory?.name,
	...sizes.custom(240, 480, 300),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-48" },
		headerLabel: "Inventory",
		className: sizeClass(
			sizes.custom(240, 480, 300),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={
					row.original.inventoryVariant?.inventory?.name || "Unknown inventory"
				}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.inventoryVariant?.sku || "No SKU"}
			/>
		</div>
	),
};

const orderComponentColumn: Column = {
	id: "orderComponent",
	header: "Order / Component",
	accessorFn: (row) => row.lineItemComponent?.parent?.sale?.orderId,
	...sizes.custom(260, 520, 340),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-56" },
		headerLabel: "Order / Component",
		className: sizeClass(sizes.custom(260, 520, 340)),
	},
	cell: ({ row }) => {
		const sale = row.original.lineItemComponent?.parent?.sale;
		const orderId = sale?.orderId || "N/A";
		const overviewUrl = getOrderOverviewUrl(sale?.orderId);
		const componentTitle =
			row.original.lineItemComponent?.parent?.title || "Untitled component";

		return (
			<div className="min-w-0 space-y-0.5">
				{overviewUrl ? (
					<Link
						href={overviewUrl}
						className="block max-w-full truncate font-medium text-primary hover:underline"
						onClick={(event) => event.stopPropagation()}
					>
						Order {orderId}
					</Link>
				) : (
					<p className="truncate font-medium">Order {orderId}</p>
				)}
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={componentTitle}
				/>
			</div>
		);
	},
};

const qtyColumn: Column = {
	id: "quantities",
	header: "Qty",
	accessorKey: "qty",
	...sizes.custom(150, 230, 170),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Quantities",
		className: sizeClass(sizes.custom(150, 230, 170), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-right">
			<p className="truncate font-mono font-medium">
				{formatQty(row.original.qty)}
			</p>
			<p className="truncate text-xs text-muted-foreground">
				Short {formatQty(row.original.shortageQty)}
			</p>
		</div>
	),
};

const stockColumn: Column = {
	id: "stock",
	header: "Stock",
	accessorKey: "inventoryStockQty",
	...sizes.custom(170, 280, 210),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Stock",
		className: sizeClass(sizes.custom(170, 280, 210)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<p className="truncate font-mono font-medium">
				{formatQty(row.original.inventoryStockQty)} available
			</p>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.supplierName || "No supplier"}
			/>
		</div>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(150, 220, 170),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-28" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(150, 220, 170)),
	},
	cell: ({ row }) => (
		<Badge variant="outline" className="max-w-full capitalize">
			<span className="truncate">{formatStatus(row.original.status)}</span>
		</Badge>
	),
};

const createdAtColumn: Column = {
	id: "createdAt",
	header: "Created",
	accessorKey: "createdAt",
	...sizes.custom(130, 210, 150),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Created",
		sortField: "createdAt",
		className: sizeClass(sizes.custom(130, 210, 150)),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{formatDate(row.original.createdAt)}
		</span>
	),
};

const referenceColumn: Column = {
	id: "references",
	header: "Refs",
	accessorKey: "id",
	...sizes.custom(130, 220, 150),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "References",
		className: sizeClass(sizes.custom(130, 220, 150)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 font-mono text-xs text-muted-foreground">
			<p className="truncate">Allocation #{row.original.id}</p>
			<p className="truncate">
				Component #{row.original.lineItemComponent?.id || "N/A"}
			</p>
		</div>
	),
};

function getActionsColumn(actions: InventoryAllocationTableActions): Column {
	return {
		id: "actions",
		header: "",
		...sizes.custom(168, 210, 184),
		enableResizing: false,
		enableHiding: false,
		meta: {
			actionCell: true,
			preventDefault: true,
			headerLabel: "Actions",
			skeleton: { type: "button", width: "w-28" },
			className: sizeClass(
				sizes.custom(168, 210, 184),
				"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
			contentClassName: "flex justify-end",
		},
		cell: ({ row }) => <Actions item={row.original} actions={actions} />,
	};
}

function Actions({
	item,
	actions,
}: {
	item: InventoryAllocationRow;
	actions: InventoryAllocationTableActions;
}) {
	return (
		<div className="relative z-10 flex justify-end gap-1">
			<Button
				type="button"
				size="sm"
				onClick={(event) => {
					event.stopPropagation();
					actions.onApprove(item.id);
				}}
				disabled={actions.isApproving}
			>
				Approve
			</Button>
			<Button
				type="button"
				size="sm"
				variant="outline"
				onClick={(event) => {
					event.stopPropagation();
					actions.onReject(item.id);
				}}
				disabled={actions.isRejecting}
			>
				Reject
			</Button>
		</div>
	);
}

export function getInventoryAllocationColumns(
	actions: InventoryAllocationTableActions,
): Column[] {
	return [
		selectColumn,
		inventoryColumn,
		orderComponentColumn,
		qtyColumn,
		stockColumn,
		statusColumn,
		createdAtColumn,
		referenceColumn,
		getActionsColumn(actions),
	];
}

export const columns = getInventoryAllocationColumns({
	onApprove: () => undefined,
	onReject: () => undefined,
});
