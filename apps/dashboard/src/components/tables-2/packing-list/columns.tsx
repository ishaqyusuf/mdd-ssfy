"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type PackingListRow = RouterOutputs["dispatch"]["packingList"][number];
export type PackingListTab = "current" | "completed" | "cancelled";

export type PackingListStatus = "queue" | "completed" | "cancelled";

export type PackingListTableMeta = {
	tab: PackingListTab;
	isAdmin: boolean;
	isUpdatingDispatchId?: number | null;
	onOpen: (item: PackingListRow) => void;
	onStatusChange: (item: PackingListRow, status: PackingListStatus) => void;
};

type Column = ColumnDef<PackingListRow>;

function getMeta(table: unknown): PackingListTableMeta | undefined {
	return (
		table as {
			options?: { meta?: PackingListTableMeta };
		}
	).options?.meta;
}

function statusLabel(status?: string | null) {
	if (status === "completed") return "Completed";
	if (status === "cancelled") return "Cancelled";
	return "Current";
}

function statusVariant(status?: string | null) {
	if (status === "completed") return "default";
	if (status === "cancelled") return "destructive";
	return "secondary";
}

export function getPackingListRowId(row: PackingListRow) {
	return String(row.dispatchId ?? row.orderNo ?? row.salesId);
}

const orderColumn: Column = {
	id: "orderNo",
	header: "Order",
	accessorKey: "orderNo",
	...sizes.custom(150, 220, 170),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Order",
		className: sizeClass(
			sizes.custom(150, 220, 170),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<p className="truncate font-mono text-sm font-semibold uppercase">
				{row.original.orderNo || "-"}
			</p>
			<p className="truncate text-xs text-muted-foreground">
				Dispatch #{row.original.dispatchId ?? "-"}
			</p>
		</div>
	),
};

const customerColumn: Column = {
	id: "customerName",
	header: "Customer",
	accessorKey: "customerName",
	...sizes.custom(180, 360, 240),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Customer",
		className: sizeClass(sizes.custom(180, 360, 240)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-medium uppercase"
			text={row.original.customerName || "Unknown customer"}
		/>
	),
};

const addressColumn: Column = {
	id: "address",
	header: "Address",
	accessorKey: "address",
	...sizes.custom(240, 480, 320),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-48" },
		headerLabel: "Address",
		className: sizeClass(sizes.custom(240, 480, 320)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm text-muted-foreground"
			text={row.original.address || "No address available"}
		/>
	),
};

const phoneColumn: Column = {
	id: "phone",
	header: "Phone",
	accessorKey: "phone",
	...sizes.custom(120, 180, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Phone",
		className: sizeClass(sizes.custom(120, 180, 140)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm text-muted-foreground"
			text={row.original.phone || "No phone number"}
		/>
	),
};

const salesRepColumn: Column = {
	id: "salesRep",
	header: "Sales Rep",
	accessorKey: "salesRep",
	...sizes.custom(110, 190, 130),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Sales Rep",
		className: sizeClass(sizes.custom(110, 190, 130)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm text-muted-foreground"
			text={row.original.salesRep || "Unassigned"}
		/>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(110, 160, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(110, 160, 120)),
	},
	cell: ({ row }) => (
		<Badge
			variant={statusVariant(row.original.status)}
			className="max-w-full rounded-full"
		>
			<span className="truncate">{statusLabel(row.original.status)}</span>
		</Badge>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(72, 96, 80),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(72, 96, 80),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const item = row.original;
		const isUpdating =
			meta?.isUpdatingDispatchId != null &&
			meta.isUpdatingDispatchId === item.dispatchId;

		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						disabled={isUpdating}
						aria-label={`Packing list actions for ${item.orderNo || "order"}`}
						onClick={(event) => event.stopPropagation()}
					>
						<Icons.MoreVertical className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					onClick={(event) => event.stopPropagation()}
				>
					<DropdownMenuItem
						onSelect={(event) => {
							event.preventDefault();
							meta?.onOpen(item);
						}}
					>
						<Icons.ExternalLink className="mr-2 size-4" />
						Open Packing Slip
					</DropdownMenuItem>
					{meta?.isAdmin ? (
						<>
							<DropdownMenuSeparator />
							{item.status !== "queue" ? (
								<DropdownMenuItem
									onSelect={(event) => {
										event.preventDefault();
										meta.onStatusChange(item, "queue");
									}}
								>
									<Icons.RotateCcw className="mr-2 size-4" />
									Move to Current
								</DropdownMenuItem>
							) : null}
							{item.status !== "completed" ? (
								<DropdownMenuItem
									onSelect={(event) => {
										event.preventDefault();
										meta.onStatusChange(item, "completed");
									}}
								>
									<Icons.CheckCheck className="mr-2 size-4" />
									Mark Completed
								</DropdownMenuItem>
							) : null}
							{item.status !== "cancelled" ? (
								<DropdownMenuItem
									className="text-destructive focus:text-destructive"
									onSelect={(event) => {
										event.preventDefault();
										meta.onStatusChange(item, "cancelled");
									}}
								>
									<Icons.XCircle className="mr-2 size-4" />
									Cancel
								</DropdownMenuItem>
							) : null}
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		);
	},
};

export const columns: Column[] = [
	orderColumn,
	customerColumn,
	addressColumn,
	phoneColumn,
	salesRepColumn,
	statusColumn,
	actionsColumn,
];
