"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type SalesInboundRow =
	RouterOutputs["inventories"]["inboundShipments"][number];

export type SalesInboundTableActions = {
	selectedInboundId?: number | null;
	onSelectInbound: (inboundId: number) => void;
};

type Column = ColumnDef<SalesInboundRow>;

const statusToneClassName: Record<string, string> = {
	pending: "border-slate-200 bg-slate-50 text-slate-700",
	in_progress: "border-blue-200 bg-blue-50 text-blue-700",
	completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
	issue_open: "border-amber-200 bg-amber-50 text-amber-700",
	closed: "border-emerald-200 bg-emerald-50 text-emerald-700",
	cancelled: "border-red-200 bg-red-50 text-red-700",
};

function titleCase(value: string | null | undefined) {
	return (value || "unknown")
		.replaceAll("_", " ")
		.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "No date";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "No date";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

function formatQty(value: number | null | undefined) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

function formatProgress(value: number | null | undefined) {
	return `${Math.round(Number(value || 0))}%`;
}

function statusClassName(status: string | null | undefined) {
	return (
		statusToneClassName[status || ""] ||
		"border-slate-200 bg-slate-50 text-slate-700"
	);
}

function customerName(order: SalesInboundRow["linkedOrders"][number]) {
	return (
		order.customer?.businessName ||
		order.customer?.name ||
		order.customer?.phoneNo ||
		"Unknown customer"
	);
}

export function getSalesInboundRowId(row: SalesInboundRow) {
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
		const meta = table.options.meta as
			| { selectedInboundId?: number | null }
			| undefined;
		const shipment = row.original;

		return (
			<div className="min-w-0 space-y-0.5">
				<div className="flex min-w-0 items-center gap-2">
					<p className="truncate font-medium">Inbound #{shipment.id}</p>
					{shipment.id === meta?.selectedInboundId ? (
						<Badge variant="secondary" className="h-5 shrink-0 text-[10px]">
							Selected
						</Badge>
					) : null}
				</div>
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={shipment.supplier?.name || "No supplier"}
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
	...sizes.custom(112, 170, 126),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(112, 170, 126)),
	},
	cell: ({ row }) => (
		<Badge
			variant="outline"
			className={cn(
				"h-5 max-w-full px-1.5 text-[10px]",
				statusClassName(row.original.status),
			)}
		>
			<span className="truncate">{titleCase(row.original.status)}</span>
		</Badge>
	),
};

const orderColumn: Column = {
	id: "order",
	header: "Order",
	accessorFn: (row) => row.linkedOrders.length,
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Order",
		className: sizeClass(sizes.custom(220, 420, 280)),
	},
	cell: ({ row }) => {
		const orders = row.original.linkedOrders || [];
		const first = orders[0];
		const extraCount = Math.max(0, orders.length - 1);

		if (!first) {
			return (
				<span className="text-sm text-muted-foreground">No linked order</span>
			);
		}

		return (
			<div className="min-w-0 space-y-0.5">
				<div className="flex min-w-0 items-center gap-2">
					<TextWithTooltip
						className="max-w-full truncate font-medium"
						text={first.orderId}
					/>
					{extraCount > 0 ? (
						<Badge variant="secondary" className="h-5 shrink-0 text-[10px]">
							+{extraCount}
						</Badge>
					) : null}
				</div>
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={customerName(first)}
				/>
				<p className="truncate text-xs text-muted-foreground">
					Qty {formatQty(first.qty)} / Received {formatQty(first.qtyReceived)}
				</p>
			</div>
		);
	},
};

const countsColumn: Column = {
	id: "counts",
	header: "Counts",
	accessorKey: "itemCount",
	...sizes.custom(132, 220, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Counts",
		className: sizeClass(sizes.custom(132, 220, 160)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-xs">
			<p className="truncate">
				<span className="font-mono font-medium">{row.original.itemCount}</span>{" "}
				<span className="text-muted-foreground">items</span>
			</p>
			<p className="truncate text-muted-foreground">
				{row.original.linkedOrders?.length || 0} orders /{" "}
				{row.original.documentCount} docs
			</p>
		</div>
	),
};

const datesColumn: Column = {
	id: "dates",
	header: "Dates",
	accessorKey: "expectedAt",
	...sizes.custom(164, 260, 190),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Dates",
		className: sizeClass(sizes.custom(164, 260, 190)),
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
				Created {formatDate(row.original.createdAt)}
			</p>
		</div>
	),
};

const progressColumn: Column = {
	id: "progress",
	header: "Progress",
	accessorKey: "progress",
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Progress",
		className: sizeClass(sizes.custom(104, 150, 118), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono font-medium">
			{formatProgress(row.original.progress)}
		</span>
	),
};

function getActionsColumn(actions: SalesInboundTableActions): Column {
	return {
		id: "actions",
		header: "",
		...sizes.custom(104, 140, 116),
		enableResizing: false,
		enableHiding: false,
		enableSorting: false,
		meta: {
			actionCell: true,
			preventDefault: true,
			headerLabel: "Actions",
			skeleton: { type: "button", width: "w-20" },
			className: sizeClass(
				sizes.custom(104, 140, 116),
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
	orderColumn,
	countsColumn,
	datesColumn,
	progressColumn,
	getActionsColumn({
		onSelectInbound: () => {},
	}),
];

export function getSalesInboundColumns(
	actions: SalesInboundTableActions,
): Column[] {
	return [
		inboundColumn,
		statusColumn,
		orderColumn,
		countsColumn,
		datesColumn,
		progressColumn,
		getActionsColumn(actions),
	];
}
