"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type InventoryInboundRow =
	RouterOutputs["inventories"]["inboundShipments"][number];

export type InventoryInboundTableActions = {
	selectedInboundId?: number | null;
	onSelectInbound: (inboundId: number) => void;
};

type Column = ColumnDef<InventoryInboundRow>;

const statusToneClassName: Record<string, string> = {
	pending: "border-slate-200 bg-slate-100 text-slate-700",
	in_progress: "border-amber-200 bg-amber-50 text-amber-700",
	completed: "border-emerald-200 bg-emerald-100 text-emerald-800",
	issue_open: "border-rose-200 bg-rose-50 text-rose-700",
	closed: "border-emerald-200 bg-emerald-100 text-emerald-800",
	cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

function formatLabel(value: string | null | undefined) {
	return value ? value.replaceAll("_", " ") : "unknown";
}

function getStatusTone(status: string | null | undefined) {
	if (!status) return "border-slate-200 bg-slate-100 text-slate-700";
	return (
		statusToneClassName[status] ??
		"border-slate-200 bg-slate-100 text-slate-700"
	);
}

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "Not set";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Not set";
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatProgress(value: number | null | undefined) {
	return `${Math.round(Number(value || 0))}%`;
}

function getSalesOverviewUrl(orderId: string | null | undefined) {
	if (!orderId) return null;
	const params = new URLSearchParams({
		overviewId: orderId,
		overviewType: "sales",
		overviewMode: "sales",
		overviewTab: "inventory",
	});
	return `/sales-book/orders/overview-v2?${params.toString()}`;
}

function getCustomerName(order: InventoryInboundRow["linkedOrders"][number]) {
	return (
		order.customer?.businessName ||
		order.customer?.name ||
		order.customer?.phoneNo ||
		"Unknown customer"
	);
}

export function getInventoryInboundRowId(row: InventoryInboundRow) {
	return String(row.id);
}

const inboundColumn: Column = {
	id: "inbound",
	header: "Inbound",
	accessorKey: "id",
	...sizes.custom(190, 340, 240),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Inbound",
		className: sizeClass(
			sizes.custom(190, 340, 240),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row, table }) => {
		const shipment = row.original;
		const meta = table.options.meta as
			| { selectedInboundId?: number | null }
			| undefined;
		return (
			<div className="min-w-0 space-y-0.5">
				<div className="flex min-w-0 items-center gap-2">
					<p className="truncate font-medium">Inbound #{shipment.id}</p>
					{shipment.id === meta?.selectedInboundId ? (
						<Badge variant="secondary" className="shrink-0">
							Selected
						</Badge>
					) : null}
				</div>
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={shipment.supplier.name}
				/>
				<p className="truncate text-xs text-muted-foreground">
					Ref {shipment.reference || "None"}
				</p>
			</div>
		);
	},
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(140, 220, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-28" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(140, 220, 160)),
	},
	cell: ({ row }) => (
		<Badge
			variant="outline"
			className={`max-w-full capitalize ${getStatusTone(row.original.status)}`}
		>
			<span className="truncate">{formatLabel(row.original.status)}</span>
		</Badge>
	),
};

const linkedOrdersColumn: Column = {
	id: "linkedOrders",
	header: "Orders",
	accessorFn: (row) => row.linkedOrders.length,
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Orders",
		className: sizeClass(sizes.custom(220, 420, 280)),
	},
	cell: ({ row }) => {
		const orders = row.original.linkedOrders;
		const firstOrder = orders[0];
		const extraCount = Math.max(0, orders.length - 1);
		const overviewUrl = getSalesOverviewUrl(firstOrder?.orderId);

		if (!firstOrder) {
			return <span className="text-muted-foreground">No linked orders</span>;
		}

		return (
			<div className="min-w-0 space-y-0.5">
				<div className="flex min-w-0 items-center gap-2">
					{overviewUrl ? (
						<Link
							href={overviewUrl}
							className="truncate font-medium text-primary hover:underline"
							onClick={(event) => event.stopPropagation()}
						>
							Order {firstOrder.orderId}
						</Link>
					) : (
						<p className="truncate font-medium">Order {firstOrder.orderId}</p>
					)}
					{extraCount > 0 ? (
						<Badge variant="secondary" className="shrink-0">
							+{extraCount}
						</Badge>
					) : null}
				</div>
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={getCustomerName(firstOrder)}
				/>
				<p className="truncate text-xs text-muted-foreground">
					Qty {Number(firstOrder.qty || 0).toLocaleString()} / Received{" "}
					{Number(firstOrder.qtyReceived || 0).toLocaleString()}
				</p>
			</div>
		);
	},
};

const countsColumn: Column = {
	id: "counts",
	header: "Counts",
	accessorKey: "itemCount",
	...sizes.custom(170, 260, 190),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Counts",
		className: sizeClass(sizes.custom(170, 260, 190)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-xs">
			<p className="truncate">
				<span className="font-mono font-medium">{row.original.itemCount}</span>{" "}
				<span className="text-muted-foreground">items</span>
			</p>
			<p className="truncate text-muted-foreground">
				Docs {row.original.documentCount} / AI {row.original.extractionCount}
			</p>
		</div>
	),
};

const datesColumn: Column = {
	id: "dates",
	header: "Dates",
	accessorKey: "expectedAt",
	...sizes.custom(180, 280, 210),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Dates",
		className: sizeClass(sizes.custom(180, 280, 210)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-xs">
			<p className="truncate">
				<span className="text-muted-foreground">Expected</span>{" "}
				<span className="font-medium">
					{formatDate(row.original.expectedAt)}
				</span>
			</p>
			<p className="truncate text-muted-foreground">
				Received {formatDate(row.original.receivedAt)}
			</p>
		</div>
	),
};

const progressColumn: Column = {
	id: "progress",
	header: "Progress",
	accessorKey: "progress",
	...sizes.custom(120, 180, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Progress",
		className: sizeClass(sizes.custom(120, 180, 140), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono font-medium">
			{formatProgress(row.original.progress)}
		</span>
	),
};

function getActionsColumn(actions: InventoryInboundTableActions): Column {
	return {
		id: "actions",
		header: "",
		...sizes.custom(120, 150, 130),
		enableResizing: false,
		enableHiding: false,
		enableSorting: false,
		meta: {
			actionCell: true,
			preventDefault: true,
			headerLabel: "Actions",
			skeleton: { type: "button", width: "w-24" },
			className: sizeClass(
				sizes.custom(120, 150, 130),
				"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
			contentClassName: "flex justify-end",
		},
		cell: ({ row }) => (
			<Button
				type="button"
				size="sm"
				variant={
					row.original.id === actions.selectedInboundId ? "default" : "outline"
				}
				className="gap-1"
				onClick={(event) => {
					event.stopPropagation();
					actions.onSelectInbound(row.original.id);
				}}
			>
				<Icons.Eye className="size-3.5" />
				Review
			</Button>
		),
	};
}

export const columns: Column[] = [
	inboundColumn,
	statusColumn,
	linkedOrdersColumn,
	countsColumn,
	datesColumn,
	progressColumn,
	getActionsColumn({
		onSelectInbound: () => {},
	}),
];

export function getInventoryInboundColumns(
	actions: InventoryInboundTableActions,
): Column[] {
	return [
		inboundColumn,
		statusColumn,
		linkedOrdersColumn,
		countsColumn,
		datesColumn,
		progressColumn,
		getActionsColumn(actions),
	];
}
