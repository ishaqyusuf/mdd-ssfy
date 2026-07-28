"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { buildSalesOverviewUrl } from "@/hooks/sales-overview-open-params";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type InventoryDispatchModeRow =
	RouterOutputs["inventories"]["salesPartialShipmentQueue"]["items"][number];

export type InventoryDispatchModeTableActions = {
	onAssignLine: (item: InventoryDispatchModeRow) => void;
	onPackLine: (item: InventoryDispatchModeRow) => void;
	onFulfillLine: (item: InventoryDispatchModeRow) => void;
	onReleaseLine: (item: InventoryDispatchModeRow) => void;
	onAssignAllocation: (
		item: InventoryDispatchModeRow,
		allocationId: number,
	) => void;
	onPackAllocation: (
		item: InventoryDispatchModeRow,
		allocationId: number,
	) => void;
	onFulfillAllocation: (
		item: InventoryDispatchModeRow,
		allocationId: number,
	) => void;
	onReleaseAllocation: (
		item: InventoryDispatchModeRow,
		allocationId: number,
	) => void;
	isMutating?: boolean;
};

type Column = ColumnDef<InventoryDispatchModeRow>;

const statusToneClassName: Record<
	InventoryDispatchModeRow["partialStatus"],
	string
> = {
	available_now: "border-emerald-200 bg-emerald-50 text-emerald-700",
	ready_to_ship_remaining: "border-blue-200 bg-blue-50 text-blue-700",
	held_until_complete: "border-slate-200 bg-slate-50 text-slate-700",
	awaiting_inbound: "border-amber-200 bg-amber-50 text-amber-700",
	backordered: "border-rose-200 bg-rose-50 text-rose-700",
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
	component: InventoryDispatchModeRow["blockerComponents"][number],
) {
	return (
		component.componentName ||
		component.inventoryName ||
		component.inventoryCategoryName ||
		component.inventoryVariantSku ||
		`Component ${component.id || "N/A"}`
	);
}

function getAllocationIds(item: InventoryDispatchModeRow) {
	return {
		approved: item.allocationIdsByStatus.approved ?? [],
		reserved: item.allocationIdsByStatus.reserved ?? [],
		picked: item.allocationIdsByStatus.picked ?? [],
	};
}

function hasAllocations(item: InventoryDispatchModeRow) {
	const ids = getAllocationIds(item);
	return ids.approved.length || ids.reserved.length || ids.picked.length;
}

function canFulfill(item: InventoryDispatchModeRow) {
	return (
		Boolean(item.salesOrderId) &&
		Boolean(item.lineItemId) &&
		item.availableToShipQty > 0 &&
		!item.holdUntilComplete
	);
}

export function getInventoryDispatchModeRowId(row: InventoryDispatchModeRow) {
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
				<Badge
					variant="outline"
					className="h-5 max-w-[130px] px-1.5 text-[10px] capitalize"
				>
					<span className="truncate">
						{formatLabel(row.original.inventoryStatus)}
					</span>
				</Badge>
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
		skeleton: { type: "badge", width: "w-28" },
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

const quantitiesColumn: Column = {
	id: "quantities",
	header: "Qty",
	accessorKey: "remainingQty",
	...sizes.custom(170, 260, 190),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Qty",
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
				Inbound {formatQty(row.original.inboundQty)}
			</p>
		</div>
	),
};

const allocationsColumn: Column = {
	id: "allocations",
	header: "Allocations",
	accessorFn: (row) =>
		row.allocationIdsByStatus.approved.length +
		row.allocationIdsByStatus.reserved.length +
		row.allocationIdsByStatus.picked.length,
	...sizes.custom(190, 320, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Allocations",
		className: sizeClass(sizes.custom(190, 320, 220)),
	},
	cell: ({ row }) => {
		const ids = getAllocationIds(row.original);

		if (!hasAllocations(row.original)) {
			return <span className="text-muted-foreground">No allocations</span>;
		}

		return (
			<div className="flex min-w-0 flex-wrap gap-1.5">
				<AllocationBadges label="Approved" ids={ids.approved} />
				<AllocationBadges label="Reserved" ids={ids.reserved} />
				<AllocationBadges label="Picked" ids={ids.picked} />
			</div>
		);
	},
};

const blockersColumn: Column = {
	id: "blockers",
	header: "Blockers",
	accessorFn: (row) => row.blockerComponents.length,
	...sizes.custom(200, 340, 240),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Blockers",
		className: sizeClass(sizes.custom(200, 340, 240)),
	},
	cell: ({ row }) => {
		const blockers = row.original.blockerComponents;
		const visibleBlockers = blockers.slice(0, 1);
		const extraCount = blockers.length - visibleBlockers.length;

		if (!blockers.length) {
			return <span className="text-xs text-muted-foreground">No blockers</span>;
		}

		return (
			<div className="min-w-0 space-y-1">
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
					<Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
						+{extraCount}
					</Badge>
				) : null}
			</div>
		);
	},
};

function getActionsColumn(actions: InventoryDispatchModeTableActions): Column {
	return {
		id: "actions",
		header: "",
		...sizes.custom(136, 180, 150),
		enableResizing: false,
		enableHiding: false,
		enableSorting: false,
		meta: {
			actionCell: true,
			preventDefault: true,
			headerLabel: "Actions",
			skeleton: { type: "button", width: "w-32" },
			className: sizeClass(
				sizes.custom(136, 180, 150),
				"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
			contentClassName: "flex justify-end",
		},
		cell: ({ row }) => (
			<InventoryDispatchActions item={row.original} actions={actions} />
		),
	};
}

function AllocationBadges({ label, ids }: { label: string; ids: number[] }) {
	if (!ids.length) return null;

	const visibleIds = ids.slice(0, 2);
	const extraCount = ids.length - visibleIds.length;

	return (
		<Badge
			variant="outline"
			className="h-5 max-w-full gap-1 px-1.5 text-[10px]"
		>
			<span>{label}</span>
			<span className="font-mono">#{visibleIds.join(", #")}</span>
			{extraCount > 0 ? <span>+{extraCount}</span> : null}
		</Badge>
	);
}

function InventoryDispatchActions({
	item,
	actions,
}: {
	item: InventoryDispatchModeRow;
	actions: InventoryDispatchModeTableActions;
}) {
	const overviewUrl = getSalesOverviewUrl(item.orderId);
	const ids = getAllocationIds(item);
	const hasLine = Boolean(item.lineItemId);
	const fulfillEnabled = canFulfill(item);

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
				disabled={actions.isMutating || !fulfillEnabled}
				className="h-8 px-2 text-xs"
				onClick={(event) => {
					event.stopPropagation();
					actions.onFulfillLine(item);
				}}
			>
				Fulfill
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						className="size-8"
						onClick={(event) => event.stopPropagation()}
					>
						<Icons.MoreHorizontal className="size-4" />
						<span className="sr-only">More dispatch actions</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					className="w-56"
					onClick={(event) => event.stopPropagation()}
				>
					<DropdownMenuLabel className="text-xs text-muted-foreground">
						Whole line
					</DropdownMenuLabel>
					<DropdownMenuItem
						disabled={actions.isMutating || !hasLine}
						onClick={() => actions.onAssignLine(item)}
					>
						<Icons.PackageOpen className="mr-2 size-4" />
						Assign line
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={actions.isMutating || !hasLine}
						onClick={() => actions.onPackLine(item)}
					>
						<Icons.Truck className="mr-2 size-4" />
						Pack line
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={actions.isMutating || !fulfillEnabled}
						onClick={() => actions.onFulfillLine(item)}
					>
						<Icons.Truck className="mr-2 size-4" />
						Fulfill line
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={actions.isMutating || !hasLine}
						onClick={() => actions.onReleaseLine(item)}
					>
						<Icons.RefreshCw className="mr-2 size-4" />
						Release line
					</DropdownMenuItem>
					{hasAllocations(item) ? (
						<>
							<DropdownMenuSeparator />
							<AllocationActionGroup
								label="Approved"
								icon={<Icons.PackageOpen className="mr-2 size-4" />}
								ids={ids.approved}
								disabled={actions.isMutating}
								actionLabel="Assign"
								onAction={(allocationId) =>
									actions.onAssignAllocation(item, allocationId)
								}
							/>
							<AllocationActionGroup
								label="Reserved"
								icon={<Icons.Truck className="mr-2 size-4" />}
								ids={ids.reserved}
								disabled={actions.isMutating}
								actionLabel="Pack"
								onAction={(allocationId) =>
									actions.onPackAllocation(item, allocationId)
								}
							/>
							<AllocationActionGroup
								label="Picked"
								icon={<Icons.Truck className="mr-2 size-4" />}
								ids={ids.picked}
								disabled={actions.isMutating || !fulfillEnabled}
								actionLabel="Fulfill"
								onAction={(allocationId) =>
									actions.onFulfillAllocation(item, allocationId)
								}
							/>
							<AllocationActionGroup
								label="Reserved"
								icon={<Icons.RefreshCw className="mr-2 size-4" />}
								ids={ids.reserved}
								disabled={actions.isMutating}
								actionLabel="Release"
								onAction={(allocationId) =>
									actions.onReleaseAllocation(item, allocationId)
								}
							/>
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function AllocationActionGroup({
	label,
	ids,
	disabled,
	actionLabel,
	icon,
	onAction,
}: {
	label: string;
	ids: number[];
	disabled?: boolean;
	actionLabel: string;
	icon: React.ReactNode;
	onAction: (allocationId: number) => void;
}) {
	if (!ids.length) return null;

	return (
		<>
			<DropdownMenuLabel className="text-xs text-muted-foreground">
				{label}
			</DropdownMenuLabel>
			{ids.map((allocationId) => (
				<DropdownMenuItem
					key={`${actionLabel}-${allocationId}`}
					disabled={disabled}
					onClick={() => onAction(allocationId)}
				>
					{icon}
					{actionLabel} #{allocationId}
				</DropdownMenuItem>
			))}
		</>
	);
}

export const columns: Column[] = [
	orderColumn,
	lineColumn,
	statusColumn,
	quantitiesColumn,
	availableColumn,
	allocationsColumn,
	blockersColumn,
	getActionsColumn({
		onAssignLine: () => {},
		onPackLine: () => {},
		onFulfillLine: () => {},
		onReleaseLine: () => {},
		onAssignAllocation: () => {},
		onPackAllocation: () => {},
		onFulfillAllocation: () => {},
		onReleaseAllocation: () => {},
	}),
];

export function getInventoryDispatchModeColumns(
	actions: InventoryDispatchModeTableActions,
): Column[] {
	return [
		orderColumn,
		lineColumn,
		statusColumn,
		quantitiesColumn,
		availableColumn,
		allocationsColumn,
		blockersColumn,
		getActionsColumn(actions),
	];
}
