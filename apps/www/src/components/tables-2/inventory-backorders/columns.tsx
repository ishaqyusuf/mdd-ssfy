"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type InventoryBackorderRow =
	RouterOutputs["inventories"]["salesBackorderQueue"]["items"][number];

export type InventoryBackorderTableActions = {
	onShipAvailable: (item: InventoryBackorderRow) => void;
	isShipping?: boolean;
};

type Column = ColumnDef<InventoryBackorderRow>;

const statusToneClassName: Record<InventoryBackorderRow["status"], string> = {
	awaiting_inbound: "border-amber-200 bg-amber-50 text-amber-700",
	backordered: "border-rose-200 bg-rose-50 text-rose-700",
	ready_to_ship_remaining: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function formatQty(value: number | null | undefined) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

function formatLabel(value: string | null | undefined) {
	return value ? value.replaceAll("_", " ") : "unknown";
}

function getSalesOverviewUrl(orderId: string | null) {
	if (!orderId) return null;
	const params = new URLSearchParams({
		overviewId: orderId,
		overviewType: "sales",
		overviewMode: "sales",
		overviewTab: "packing",
	});
	return `/sales-book/orders/overview-v2?${params.toString()}`;
}

function getComponentLabel(
	component: InventoryBackorderRow["blockerComponents"][number],
) {
	return (
		component.componentName ||
		component.inventoryName ||
		component.inventoryCategoryName ||
		component.inventoryVariantSku ||
		`Component ${component.id || "N/A"}`
	);
}

export function getInventoryBackorderRowId(row: InventoryBackorderRow) {
	return `${row.salesOrderId}-${row.lineItemId}`;
}

const orderColumn: Column = {
	id: "order",
	header: "Order",
	accessorKey: "orderId",
	...sizes.custom(160, 280, 190),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Order",
		className: sizeClass(
			sizes.custom(160, 280, 190),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => {
		const item = row.original;
		const overviewUrl = getSalesOverviewUrl(item.orderId);

		return (
			<div className="min-w-0 space-y-0.5">
				{overviewUrl ? (
					<Link
						href={overviewUrl}
						className="block max-w-full truncate font-medium text-primary hover:underline"
						onClick={(event) => event.stopPropagation()}
					>
						Order {item.orderId || item.salesOrderId || "N/A"}
					</Link>
				) : (
					<p className="truncate font-medium">
						Order {item.orderId || item.salesOrderId || "N/A"}
					</p>
				)}
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={item.customerName || "Unknown customer"}
				/>
			</div>
		);
	},
};

const lineColumn: Column = {
	id: "line",
	header: "Line",
	accessorKey: "title",
	...sizes.custom(200, 360, 240),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-48" },
		headerLabel: "Line",
		className: sizeClass(sizes.custom(200, 360, 240)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.title || row.original.uid || "Untitled line item"}
			/>
			<div className="flex min-w-0 flex-wrap items-center gap-1.5">
				{row.original.inventoryStatus ? (
					<Badge
						variant="outline"
						className="h-5 max-w-[130px] px-1.5 text-[10px] capitalize"
					>
						<span className="truncate">
							{formatLabel(row.original.inventoryStatus)}
						</span>
					</Badge>
				) : null}
				{row.original.holdUntilComplete ? (
					<Badge
						variant="outline"
						className="h-5 whitespace-nowrap px-1.5 text-[10px]"
					>
						Hold until complete
					</Badge>
				) : null}
			</div>
		</div>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(124, 190, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-28" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(124, 190, 140)),
	},
	cell: ({ row }) => (
		<Badge
			variant="outline"
			className={`h-6 max-w-full px-2 text-[11px] capitalize ${statusToneClassName[row.original.status]}`}
		>
			<span className="truncate">{formatLabel(row.original.status)}</span>
		</Badge>
	),
};

const fulfillmentColumn: Column = {
	id: "fulfillment",
	header: "Fulfillment",
	accessorKey: "remainingQty",
	...sizes.custom(170, 260, 190),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Fulfillment",
		className: sizeClass(sizes.custom(170, 260, 190)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-xs">
			<p className="truncate">
				<span className="text-muted-foreground">Ordered</span>{" "}
				<span className="font-mono font-medium">
					{formatQty(row.original.orderedQty)}
				</span>
				<span className="text-muted-foreground"> / Remaining</span>{" "}
				<span className="font-mono font-medium">
					{formatQty(row.original.remainingQty)}
				</span>
			</p>
			<p className="truncate text-muted-foreground">
				Allocated {formatQty(row.original.allocatedQty)} / Picked{" "}
				{formatQty(row.original.pickedQty)} / Shipped{" "}
				{formatQty(row.original.shippedQty)}
			</p>
		</div>
	),
};

const availableColumn: Column = {
	id: "available",
	header: "Available",
	accessorKey: "availableToShipQty",
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Available",
		className: sizeClass(sizes.custom(104, 150, 118), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-right">
			<p className="truncate font-mono font-medium">
				{formatQty(row.original.availableToShipQty)}
			</p>
			<p className="truncate text-xs text-muted-foreground">
				Ship now {row.original.canShipNow ? "Yes" : "No"}
			</p>
		</div>
	),
};

const backorderColumn: Column = {
	id: "backorder",
	header: "Backorder",
	accessorKey: "backorderedQty",
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Backorder",
		className: sizeClass(sizes.custom(112, 170, 128), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-right">
			<p className="truncate font-mono font-medium">
				{formatQty(row.original.backorderedQty)}
			</p>
			<p className="truncate text-xs text-muted-foreground">
				Inbound {formatQty(row.original.inboundQty)}
			</p>
		</div>
	),
};

const receivedColumn: Column = {
	id: "received",
	header: "Received",
	accessorKey: "receivedQty",
	...sizes.custom(96, 140, 108),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Received",
		className: sizeClass(sizes.custom(96, 140, 108), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono font-medium">
			{formatQty(row.original.receivedQty)}
		</span>
	),
};

const blockersColumn: Column = {
	id: "blockers",
	header: "Blockers",
	accessorFn: (row) => row.blockerComponents.length,
	...sizes.custom(200, 340, 240),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-48" },
		headerLabel: "Blockers",
		className: sizeClass(sizes.custom(200, 340, 240)),
	},
	cell: ({ row }) => {
		const blockers = row.original.blockerComponents;
		const visibleBlockers = blockers.slice(0, 1);
		const extraCount = blockers.length - visibleBlockers.length;

		if (!blockers.length) {
			return <span className="text-muted-foreground">No blockers</span>;
		}

		return (
			<div className="min-w-0 space-y-0.5">
				{visibleBlockers.map((component) => (
					<div key={component.id} className="min-w-0 text-xs">
						<TextWithTooltip
							className="max-w-full truncate font-medium"
							text={getComponentLabel(component)}
						/>
						<p className="truncate text-muted-foreground">
							Need {formatQty(component.remainingQty)} / Backorder{" "}
							{formatQty(component.backorderedQty)} / Inbound{" "}
							{formatQty(component.inboundQty)}
						</p>
					</div>
				))}
				{extraCount > 0 ? (
					<Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
						+{extraCount}
					</Badge>
				) : null}
			</div>
		);
	},
};

function getActionsColumn(actions: InventoryBackorderTableActions): Column {
	return {
		id: "actions",
		header: "",
		...sizes.custom(124, 160, 136),
		enableResizing: false,
		enableHiding: false,
		enableSorting: false,
		meta: {
			actionCell: true,
			preventDefault: true,
			headerLabel: "Actions",
			skeleton: { type: "button", width: "w-28" },
			className: sizeClass(
				sizes.custom(124, 160, 136),
				"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
			contentClassName: "flex justify-end",
		},
		cell: ({ row }) => (
			<BackorderActions item={row.original} actions={actions} />
		),
	};
}

function BackorderActions({
	item,
	actions,
}: {
	item: InventoryBackorderRow;
	actions: InventoryBackorderTableActions;
}) {
	const overviewUrl = getSalesOverviewUrl(item.orderId);
	const canShip =
		Boolean(item.salesOrderId) && Boolean(item.lineItemId) && item.canShipNow;

	return (
		<div className="relative z-10 flex justify-end gap-1">
			{overviewUrl ? (
				<Button
					asChild
					type="button"
					size="icon"
					variant="ghost"
					className="size-8"
				>
					<Link href={overviewUrl} title="Open sale">
						<Icons.ExternalLink className="size-4" />
					</Link>
				</Button>
			) : null}
			<Button
				type="button"
				size="sm"
				className="h-8 px-2 text-xs"
				onClick={(event) => {
					event.stopPropagation();
					actions.onShipAvailable(item);
				}}
				disabled={actions.isShipping || !canShip}
			>
				<Icons.Truck className="mr-1.5 size-3.5" />
				Ship
			</Button>
		</div>
	);
}

export function getInventoryBackorderColumns(
	actions: InventoryBackorderTableActions,
): Column[] {
	return [
		orderColumn,
		lineColumn,
		statusColumn,
		fulfillmentColumn,
		availableColumn,
		backorderColumn,
		receivedColumn,
		blockersColumn,
		getActionsColumn(actions),
	];
}

export const columns = getInventoryBackorderColumns({
	onShipAvailable: () => undefined,
});
