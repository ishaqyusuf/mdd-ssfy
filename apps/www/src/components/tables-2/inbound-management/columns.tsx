"use client";

import {
	getInventoryInboundOwnershipLabel,
	getInventoryInboundOwnershipTitle,
	getSingleInventoryInboundId,
} from "@/components/sales-inbound-status-badge";
import { useSalesInventorySegmentQuery } from "@/components/sales-overview-system/hooks/use-sales-inventory-segment-query";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useInboundStatusModal } from "@/hooks/use-inbound-status-modal";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type InboundManagementRow =
	RouterOutputs["sales"]["inboundIndex"]["data"][number];

export type Item = InboundManagementRow;

type Column = ColumnDef<InboundManagementRow>;

export function getInboundRowId(row: InboundManagementRow) {
	return row.uid || `inbound-${row.id}`;
}

function getStatusLabel(status?: string | null) {
	return status || "N/A";
}

const orderColumn: Column = {
	id: "orderId",
	header: "Order",
	accessorKey: "orderId",
	...sizes.custom(132, 220, 154),
	enableResizing: true,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Order",
		className: sizeClass(
			sizes.custom(132, 220, 154),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<TextWithTooltip
				className="max-w-full truncate font-mono text-sm font-medium"
				text={row.original.orderId || `#${row.original.id}`}
			/>
			<div className="text-xs text-muted-foreground">
				Sale #{row.original.id}
			</div>
		</div>
	),
};

const customerColumn: Column = {
	id: "customer",
	header: "Customer",
	accessorKey: "displayName",
	...sizes.custom(180, 340, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Customer",
		className: sizeClass(sizes.custom(180, 340, 220)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<TextWithTooltip
				className="max-w-full truncate font-medium uppercase"
				text={row.original.displayName || "Unnamed customer"}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs uppercase text-muted-foreground"
				text={row.original.customerPhone || "No phone"}
			/>
		</div>
	),
};

const salesRepColumn: Column = {
	id: "salesRep",
	header: "Sales Rep",
	accessorKey: "salesRep",
	...sizes.custom(86, 140, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Sales Rep",
		className: sizeClass(sizes.custom(86, 140, 104)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate uppercase text-muted-foreground"
			text={row.original.salesRep || "Unassigned"}
		/>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "inboundStatus",
	...sizes.custom(116, 180, 132),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(116, 180, 132)),
	},
	cell: ({ row }) => {
		const hasInventoryInbound =
			!!row.original.inventoryInboundOwnership?.hasInventoryInbound;
		const label = hasInventoryInbound
			? getInventoryInboundOwnershipLabel(
					row.original.inventoryInboundOwnership,
				)
			: getStatusLabel(row.original.inboundStatus);
		const title = hasInventoryInbound
			? getInventoryInboundOwnershipTitle(
					row.original.inventoryInboundOwnership,
				)
			: `Manual order status - ${label}`;

		return (
			<div className="flex min-w-0 items-center" title={title}>
				<Progress>
					<Progress.Status>{label}</Progress.Status>
				</Progress>
			</div>
		);
	},
};

const actionsColumn: Column = {
	id: "actions",
	header: "Actions",
	...sizes.custom(64, 64),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(64, 64),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <InboundActions item={row.original} />,
};

export const columns: Column[] = [
	orderColumn,
	customerColumn,
	salesRepColumn,
	statusColumn,
	actionsColumn,
];

function InboundActions({ item }: { item: InboundManagementRow }) {
	const { setParams } = useInboundStatusModal();
	const overviewQuery = useSalesOverviewQuery();
	const { setInventorySegment } = useSalesInventorySegmentQuery();
	const salesPreview = useSalesPreview();
	const hasInventoryInbound =
		!!item.inventoryInboundOwnership?.hasInventoryInbound;
	const selectedInventoryInboundId = getSingleInventoryInboundId(
		item.inventoryInboundOwnership,
	);

	return (
		<Button
			type="button"
			size="icon"
			variant="ghost"
			className={cn(
				"size-8 rounded-full text-muted-foreground",
				"hover:bg-muted hover:text-foreground",
			)}
			aria-label={`${hasInventoryInbound ? "Open inventory inbounds" : "Update inbound"} for ${
				item.orderId || `sale ${item.id}`
			}`}
			title={
				hasInventoryInbound
					? getInventoryInboundOwnershipTitle(item.inventoryInboundOwnership)
					: "Update inbound"
			}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				if (hasInventoryInbound) {
					const orderNo = String(item.uuid || item.orderId || "");
					if (!orderNo) return;

					setInventorySegment("inbounds", {
						inboundId: selectedInventoryInboundId,
					});
					overviewQuery.setParams({
						"sales-overview-id": orderNo,
						"sales-type": "order",
						mode: "sales",
						salesTab: "inventory",
						"prod-item-tab": null,
						"prod-item-view": null,
						dispatchOverviewId: null,
					});
					return;
				}

				setParams({
					inboundOrderId: item.id,
					inboundOrderNo: item.orderId,
				});
				void salesPreview.preview(item.id, "order", {
					mode: "packing list",
				});
			}}
		>
			{hasInventoryInbound ? (
				<Icons.PackageOpen className="size-4" />
			) : (
				<Icons.Edit className="size-4" />
			)}
			<span className="sr-only">
				{hasInventoryInbound ? "Open inventory inbounds" : "Update inbound"}
			</span>
		</Button>
	);
}
