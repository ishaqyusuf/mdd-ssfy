"use client";

import {
	SalesOrderInvoiceCell,
	SalesOrderStatusCell,
} from "@/components/tables-2/sales-orders/order-finance-status-cells";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { Progress } from "@gnd/ui/progress";
import type { ColumnDef } from "@tanstack/react-table";
import { PackageCheck } from "lucide-react";
import type { SalesDispatch } from "./columns";
import { getDispatchPackingTotals } from "./packing-totals";

type Column = ColumnDef<SalesDispatch>;

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "Unscheduled";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Unscheduled";
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year:
			date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
	});
}

function WorkspaceActions({ item }: { item: SalesDispatch }) {
	const overview = useSalesOverviewQuery();
	return (
		<Button
			variant="ghost"
			size="icon"
			aria-label={`Open Packing for ${item.order?.orderId || `dispatch ${item.id}`}`}
			onClick={(event) => {
				event.stopPropagation();
				overview.openDispatch(item.order?.orderId, item.id, "packing");
			}}
		>
			<PackageCheck />
		</Button>
	);
}

export const workspaceColumns: Column[] = [
	{
		id: "select",
		size: 50,
		minSize: 50,
		maxSize: 50,
		enableResizing: false,
		enableHiding: false,
		meta: {
			sticky: true,
			skeleton: { type: "checkbox" },
			headerLabel: "Select",
			className:
				"w-[50px] min-w-[50px] md:sticky md:left-0 bg-background z-20 justify-center",
		},
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(checked) => row.toggleSelected(checked === true)}
			/>
		),
	},
	{
		id: "dueDate",
		header: "Schedule",
		accessorKey: "dueDate",
		size: 132,
		minSize: 118,
		maxSize: 180,
		meta: {
			skeleton: { type: "text", width: "w-24" },
			headerLabel: "Schedule",
			sortField: "dueDate",
			className: "w-[132px] min-w-[118px]",
		},
		cell: ({ row }) => (
			<div className="flex min-w-0 flex-col gap-1">
				<span
					className={cn(
						"truncate font-medium",
						row.original.workspace?.risks?.includes("overdue") &&
							"text-red-600",
					)}
				>
					{formatDate(row.original.dueDate)}
				</span>
				<span className="truncate text-xs text-muted-foreground">
					{row.original.dueStatusLabel || "Schedule required"}
				</span>
			</div>
		),
	},
	{
		id: "orderId",
		header: "Order / Customer",
		accessorFn: (row) => row.order?.orderId,
		size: 220,
		minSize: 180,
		maxSize: 320,
		meta: {
			sticky: true,
			skeleton: { type: "text", width: "w-32" },
			headerLabel: "Order / customer",
			sortField: "orderId",
			className:
				"w-[220px] min-w-[180px] md:sticky md:left-[50px] bg-background z-20",
		},
		cell: ({ row }) => {
			const customer =
				row.original.order?.customer?.businessName ||
				row.original.order?.customer?.name ||
				row.original.order?.shippingAddress?.name ||
				"Unnamed customer";
			return (
				<div className="flex min-w-0 flex-col gap-1">
					<span className="truncate font-mono text-sm font-semibold">
						{row.original.order?.orderId || `#${row.original.id}`}
					</span>
					<span className="truncate text-xs text-muted-foreground">
						{customer}
					</span>
				</div>
			);
		},
	},
	{
		id: "destination",
		header: "Destination",
		accessorFn: (row) => row.order?.shippingAddress?.address1,
		size: 230,
		minSize: 180,
		maxSize: 360,
		meta: {
			skeleton: { type: "text", width: "w-40" },
			headerLabel: "Destination",
			className: "w-[230px] min-w-[180px]",
		},
		cell: ({ row }) => {
			const address = row.original.order?.shippingAddress;
			const line = [address?.address1, address?.city, address?.state]
				.filter(Boolean)
				.join(", ");
			return (
				<div className="flex min-w-0 flex-col gap-1">
					<span className="truncate">{line || "Address required"}</span>
					<span className="truncate text-xs text-muted-foreground">
						{address?.phoneNo ||
							row.original.order?.customer?.phoneNo ||
							"No phone"}
					</span>
				</div>
			);
		},
	},
	{
		id: "driver",
		header: "Driver",
		accessorFn: (row) => row.driver?.name,
		size: 150,
		minSize: 120,
		maxSize: 220,
		meta: {
			skeleton: { type: "text", width: "w-28" },
			headerLabel: "Driver",
			sortField: "driverId",
			className: "w-[150px] min-w-[120px]",
		},
		cell: ({ row }) =>
			row.original.driver?.name ? (
				<span className="truncate font-medium">{row.original.driver.name}</span>
			) : (
				<Badge variant="outline">Unassigned</Badge>
			),
	},
	{
		id: "packing",
		header: "Packing",
		size: 150,
		minSize: 130,
		maxSize: 210,
		meta: {
			skeleton: { type: "text", width: "w-28" },
			headerLabel: "Packing",
			className: "w-[150px] min-w-[130px]",
		},
		cell: ({ row }) => {
			const { packed, pending, total } = getDispatchPackingTotals(row.original);
			const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;
			return (
				<div className="flex min-w-0 flex-col gap-2">
					<div className="flex items-center justify-between gap-2 text-xs">
						<span>
							{packed}/{total} packed
						</span>
						<span className="text-muted-foreground">{pending} left</span>
					</div>
					<Progress value={percentage} />
				</div>
			);
		},
	},
	{
		id: "invoice",
		header: "Invoice",
		accessorFn: (row) => row.order?.invoiceTotal,
		size: 124,
		minSize: 110,
		maxSize: 180,
		meta: {
			skeleton: { type: "text", width: "w-20" },
			headerLabel: "Invoice",
			className: "w-[124px] min-w-[110px] text-right",
		},
		cell: ({ row }) =>
			row.original.order ? (
				<SalesOrderInvoiceCell item={row.original.order} />
			) : (
				<span className="text-muted-foreground">—</span>
			),
	},
	{
		id: "status",
		header: "Status",
		accessorFn: (row) => row.order?.status,
		size: 150,
		minSize: 120,
		maxSize: 210,
		meta: {
			skeleton: { type: "badge", width: "w-24" },
			headerLabel: "Status",
			className: "w-[150px] min-w-[120px]",
		},
		cell: ({ row }) =>
			row.original.order ? (
				<SalesOrderStatusCell item={row.original.order} />
			) : (
				<span className="text-muted-foreground">—</span>
			),
	},
	{
		id: "actions",
		header: "Actions",
		size: 72,
		minSize: 72,
		maxSize: 72,
		enableResizing: false,
		enableHiding: false,
		meta: {
			skeleton: { type: "icon" },
			headerLabel: "Actions",
			className:
				"w-[72px] min-w-[72px] md:sticky md:right-0 bg-background z-20 justify-center",
		},
		cell: ({ row }) => <WorkspaceActions item={row.original} />,
	},
];

const completedDateColumn: Column = {
	id: "completedAt",
	header: "Completed",
	accessorKey: "deliveredAt",
	size: 132,
	minSize: 118,
	maxSize: 180,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Completed",
		sortField: "deliveredAt",
		className: "w-[132px] min-w-[118px]",
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 flex-col gap-1">
			<span className="truncate font-medium">
				{formatDate(row.original.deliveredAt || row.original.updatedAt)}
			</span>
			<span className="truncate text-xs text-muted-foreground">Fulfilled</span>
		</div>
	),
};

export const completedWorkspaceColumns: Column[] = workspaceColumns.map(
	(column) => (column.id === "dueDate" ? completedDateColumn : column),
);
