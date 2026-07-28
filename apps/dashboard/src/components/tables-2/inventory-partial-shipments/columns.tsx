"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { buildSalesOverviewUrl } from "@/hooks/sales-overview-open-params";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { Switch } from "@gnd/ui/switch";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type InventoryPartialShipmentRow =
	RouterOutputs["inventories"]["salesPartialShipmentQueue"]["items"][number];

export type InventoryPartialShipmentTableActions = {
	onToggleHold: (
		item: InventoryPartialShipmentRow,
		holdUntilComplete: boolean,
	) => void;
	onShipAvailable: (item: InventoryPartialShipmentRow) => void;
	isHolding?: boolean;
	isShipping?: boolean;
};

type Column = ColumnDef<InventoryPartialShipmentRow>;

const statusToneClassName: Record<
	InventoryPartialShipmentRow["partialStatus"],
	string
> = {
	available_now: "border-emerald-200 bg-emerald-50 text-emerald-700",
	held_until_complete: "border-slate-200 bg-slate-50 text-slate-700",
	awaiting_inbound: "border-amber-200 bg-amber-50 text-amber-700",
	backordered: "border-rose-200 bg-rose-50 text-rose-700",
	ready_to_ship_remaining: "border-blue-200 bg-blue-50 text-blue-700",
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
	return buildSalesOverviewUrl(orderId, "dispatch-modal", {
		salesTab: "packing",
	});
}

function getComponentLabel(
	component: InventoryPartialShipmentRow["blockerComponents"][number],
) {
	return (
		component.componentName ||
		component.inventoryName ||
		component.inventoryCategoryName ||
		component.inventoryVariantSku ||
		`Component ${component.id || "N/A"}`
	);
}

export function getInventoryPartialShipmentRowId(
	row: InventoryPartialShipmentRow,
) {
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
			<div className="flex min-w-0 flex-wrap items-center gap-1">
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
						Hold
					</Badge>
				) : null}
			</div>
		</div>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "partialStatus",
	...sizes.custom(124, 190, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-32" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(124, 190, 140)),
	},
	cell: ({ row }) => (
		<Badge
			variant="outline"
			className={`h-6 max-w-full px-2 text-[11px] capitalize ${statusToneClassName[row.original.partialStatus]}`}
		>
			<span className="truncate">
				{formatLabel(row.original.partialStatus)}
			</span>
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
				Shipped {formatQty(row.original.shippedQty)} / Picked{" "}
				{formatQty(row.original.pickedQty)}
			</p>
		</div>
	),
};

const availabilityColumn: Column = {
	id: "availability",
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

const holdbackColumn: Column = {
	id: "holdback",
	header: "Holdback",
	accessorKey: "heldBackQty",
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Holdback",
		className: sizeClass(sizes.custom(112, 170, 128), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-right">
			<p className="truncate font-mono font-medium">
				{formatQty(row.original.heldBackQty)}
			</p>
			<p className="truncate text-xs text-muted-foreground">
				Received {formatQty(row.original.receivedQty)}
			</p>
		</div>
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
			return (
				<span className="text-xs text-muted-foreground">No blockers</span>
			);
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
							Need {formatQty(component.remainingQty)} / Allocated{" "}
							{formatQty(component.allocatedQty)} / Inbound{" "}
							{formatQty(component.inboundQty)}
						</p>
					</div>
				))}
				{extraCount > 0 ? (
					<Badge className="h-5 px-1.5 text-[10px]" variant="secondary">
						+{extraCount}
					</Badge>
				) : null}
			</div>
		);
	},
};

function getHoldColumn(actions: InventoryPartialShipmentTableActions): Column {
	return {
		id: "hold",
		header: "Hold",
		accessorKey: "holdUntilComplete",
		...sizes.custom(82, 120, 94),
		enableResizing: false,
		enableSorting: false,
		meta: {
			preventDefault: true,
			headerLabel: "Hold",
			skeleton: { type: "button", width: "w-16" },
			className: sizeClass(sizes.custom(82, 120, 94)),
			contentClassName: "flex items-center justify-center",
		},
		cell: ({ row }) => (
			<Switch
				checked={row.original.holdUntilComplete}
				disabled={!row.original.lineItemId || actions.isHolding}
				aria-label="Hold until complete"
				onClick={(event) => event.stopPropagation()}
				onCheckedChange={(checked) => {
					if (!row.original.lineItemId) return;
					actions.onToggleHold(row.original, checked);
				}}
			/>
		),
	};
}

function getActionsColumn(
	actions: InventoryPartialShipmentTableActions,
): Column {
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
			<PartialShipmentActions item={row.original} actions={actions} />
		),
	};
}

function PartialShipmentActions({
	item,
	actions,
}: {
	item: InventoryPartialShipmentRow;
	actions: InventoryPartialShipmentTableActions;
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
				Ship
			</Button>
		</div>
	);
}

export const columns: Column[] = [
	orderColumn,
	lineColumn,
	statusColumn,
	fulfillmentColumn,
	availabilityColumn,
	holdbackColumn,
	blockersColumn,
	getHoldColumn({
		onToggleHold: () => {},
		onShipAvailable: () => {},
	}),
	getActionsColumn({
		onToggleHold: () => {},
		onShipAvailable: () => {},
	}),
];

export function getInventoryPartialShipmentColumns(
	actions: InventoryPartialShipmentTableActions,
): Column[] {
	return [
		orderColumn,
		lineColumn,
		statusColumn,
		fulfillmentColumn,
		availabilityColumn,
		holdbackColumn,
		blockersColumn,
		getHoldColumn(actions),
		getActionsColumn(actions),
	];
}
