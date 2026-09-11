"use client";

import { useFulfillmentParams } from "@/hooks/use-fulfillment-params";
import { SalesOrderInvoiceCell } from "@/components/tables-2/sales-orders/order-finance-status-cells";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

export type FulfillmentOrder =
	RouterOutputs["dispatch"]["fulfillmentOrders"]["data"][number];
const dateLabel = (value: Date | string | null) =>
	value
		? new Date(value).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: "Unscheduled";

function OpenOrder({ order }: { order: FulfillmentOrder }) {
	const overview = useFulfillmentParams();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label={`Order ${order.orderNo} actions`}
				>
					<MoreHorizontal className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onSelect={() => overview.openOrder(order.id)}>
					Open order
				</DropdownMenuItem>
				{order.workspace.backlog && (
					<DropdownMenuItem
						onSelect={() => overview.openCreateFulfillment(order.id)}
					>
						Assign backlog
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export const columns: ColumnDef<FulfillmentOrder>[] = [
	{
		id: "select",
		size: 50,
		minSize: 50,
		maxSize: 50,
		enableResizing: false,
		enableHiding: false,
		meta: { headerLabel: "Select", sticky: true },
		cell: ({ row }) => (
			<Checkbox
				aria-label={`Select order ${row.original.orderNo}`}
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(value === true)}
			/>
		),
	},
	{
		id: "orderId",
		header: "Order / Customer",
		size: 240,
		minSize: 180,
		meta: {
			headerLabel: "Order / Customer",
			sortField: "orderId",
			sticky: true,
		},
		cell: ({ row }) => (
			<div className="min-w-0">
				<div className="truncate font-mono font-semibold">
					{row.original.orderNo}
				</div>
				<div className="truncate text-xs text-muted-foreground">
					{row.original.customerName}
				</div>
			</div>
		),
	},
	{
		id: "orderDate",
		header: "Order date",
		size: 130,
		minSize: 110,
		meta: { headerLabel: "Order date", sortField: "createdAt" },
		cell: ({ row }) => (
			<span className="text-muted-foreground">
				{row.original.createdAt ? dateLabel(row.original.createdAt) : "—"}
			</span>
		),
	},
	{
		id: "dueDate",
		header: "Next fulfillment",
		size: 140,
		minSize: 120,
		meta: { headerLabel: "Next fulfillment", sortField: "dueDate" },
		cell: ({ row }) => dateLabel(row.original.workspace.nextDueDate),
	},
	{
		id: "status",
		header: "Order status",
		size: 170,
		minSize: 140,
		enableSorting: false,
		meta: { headerLabel: "Order status" },
		cell: ({ row }) => (
			<Badge variant="secondary" className="capitalize">
				{row.original.pipeline.headline.label}
			</Badge>
		),
	},
	{
		id: "assignedTo",
		header: "Drivers",
		size: 190,
		minSize: 150,
		enableSorting: false,
		meta: { headerLabel: "Drivers" },
		cell: ({ row }) => {
			const { drivers, unassignedCount, deliveryMode } = row.original.workspace;
			return (
				<div className="min-w-0">
					<div
						className="truncate"
						title={drivers
							.map((driver) => driver.name || `Driver ${driver.id}`)
							.join(", ")}
					>
						{drivers.length
							? drivers
									.map((driver) => driver.name || `Driver ${driver.id}`)
									.join(", ")
							: deliveryMode === "pickup"
								? "Customer pickup"
								: "Unassigned"}
					</div>
					{unassignedCount > 0 && drivers.length > 0 && (
						<div className="text-xs text-muted-foreground">
							{unassignedCount} unassigned
						</div>
					)}
				</div>
			);
		},
	},
	{
		id: "fulfillments",
		header: "Fulfillments",
		size: 115,
		minSize: 105,
		meta: { headerLabel: "Fulfillments" },
		cell: ({ row }) => (
			<div className="tabular-nums">
				{row.original.workspace.fulfillments.length} total
				<div className="text-xs text-muted-foreground">
					{row.original.workspace.activeCount} active
				</div>
			</div>
		),
	},
	{
		id: "quantities",
		header: "Quantities",
		size: 200,
		minSize: 175,
		meta: { headerLabel: "Quantities" },
		cell: ({ row }) => {
			const { quantities } = row.original.workspace;
			const total = (key: "ordered" | "delivered") =>
				quantities.lines.reduce(
					(sum, line) => sum + line[key].qty + line[key].lh + line[key].rh,
					0,
				);
			return (
				<div>
					<div className="text-xs text-muted-foreground">
						{total("delivered")} / {total("ordered")} delivered
					</div>
					<div className="text-sm">
						{quantities.resolved
							? row.original.workspace.fulfillments.length === 0
								? "Unassigned"
								: `${quantities.backlogQty} units backlog`
							: "Review quantities"}
					</div>
				</div>
			);
		},
	},
	{
		id: "shipTo",
		header: "Ship to",
		size: 220,
		minSize: 160,
		meta: { headerLabel: "Ship to" },
		cell: ({ row }) => (
			<span className="truncate" title={row.original.destination}>
				{row.original.destination || "No address"}
			</span>
		),
	},
	{
		id: "invoice",
		header: "Invoice",
		size: 170,
		minSize: 145,
		meta: { headerLabel: "Invoice" },
		cell: ({ row }) =>
			row.original.invoice ? (
				<SalesOrderInvoiceCell
					item={{
						...row.original.invoice,
						latestPaymentReview:
							row.original.invoice.latestPaymentReview ?? null,
					}}
				/>
			) : (
				"—"
			),
	},
	{
		id: "actions",
		size: 50,
		minSize: 50,
		maxSize: 50,
		enableHiding: false,
		enableResizing: false,
		meta: { headerLabel: "Actions" },
		cell: ({ row }) => <OpenOrder order={row.original} />,
	},
];
