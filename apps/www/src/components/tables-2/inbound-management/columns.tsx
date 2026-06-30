"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useInboundStatusModal } from "@/hooks/use-inbound-status-modal";
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
	...sizes.custom(150, 240, 180),
	enableResizing: true,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Order",
		className: sizeClass(
			sizes.custom(150, 240, 180),
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
	...sizes.custom(220, 420, 300),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Customer",
		className: sizeClass(sizes.custom(220, 420, 300)),
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
	...sizes.custom(140, 260, 180),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Sales Rep",
		className: sizeClass(sizes.custom(140, 260, 180)),
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
	...sizes.custom(150, 240, 180),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(150, 240, 180)),
	},
	cell: ({ row }) => {
		const label = getStatusLabel(row.original.inboundStatus);

		return (
			<div className="flex min-w-0 items-center">
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
	...sizes.custom(92, 92),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(92, 92),
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
	const salesPreview = useSalesPreview();

	return (
		<Button
			type="button"
			size="icon"
			variant="ghost"
			className={cn(
				"size-8 rounded-full text-muted-foreground",
				"hover:bg-muted hover:text-foreground",
			)}
			aria-label={`Update inbound for ${item.orderId || `sale ${item.id}`}`}
			title="Update inbound"
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				setParams({
					inboundOrderId: item.id,
					inboundOrderNo: item.orderId,
				});
				void salesPreview.preview(item.id, "order", {
					mode: "packing list",
				});
			}}
		>
			<Icons.Edit className="size-4" />
			<span className="sr-only">Update inbound</span>
		</Button>
	);
}
