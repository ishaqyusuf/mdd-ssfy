"use client";

import { SalesMenu } from "@/components/sales-menu";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import {
	SalesOrderInvoiceCell,
	SalesOrderStatusCell,
} from "@/components/tables-2/sales-orders/order-finance-status-cells";
import { useAuth } from "@/hooks/use-auth";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";

export type DispatchBacklogRow =
	RouterOutputs["dispatch"]["backlog"]["data"][number];

type Column = ColumnDef<DispatchBacklogRow>;

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "Unknown";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Unknown";
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year:
			date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
	});
}

function BacklogActions({
	item,
	onCreateDispatch,
}: {
	item: DispatchBacklogRow;
	onCreateDispatch: (row: DispatchBacklogRow) => void;
}) {
	const auth = useAuth();
	return (
		<div className="flex items-center justify-end gap-1">
			<Button
				variant="ghost"
				size="icon"
				aria-label={`Create dispatch for ${item.orderId}`}
				onClick={(event) => {
					event.stopPropagation();
					onCreateDispatch(item);
				}}
			>
				<Plus />
			</Button>
			{auth.can?.editOrders ? (
				<SalesMenu
					id={item.id}
					slug={item.slug}
					type="order"
					orderNo={item.orderId}
					customerEmail={item.email}
					customerPhone={item.customerPhone}
					customerName={item.customerName}
					align="end"
					trigger={
						<Button
							variant="ghost"
							size="icon"
							aria-label={`More actions for ${item.orderId}`}
							onClick={(event) => event.stopPropagation()}
						>
							<MoreHorizontal />
						</Button>
					}
				>
					<SalesMenu.MarkAs
						asSubmenu={false}
						currentStatus={item.status}
						productionStatus={item.productionState}
					/>
				</SalesMenu>
			) : null}
		</div>
	);
}

export function getDispatchBacklogColumns(
	onCreateDispatch: (row: DispatchBacklogRow) => void,
): Column[] {
	return [
		{
			id: "select",
			...sizes.custom(50, 50, 50),
			enableResizing: false,
			enableHiding: false,
			enableSorting: false,
			meta: {
				sticky: true,
				headerLabel: "Select",
				className: sizeClass(
					sizes.custom(50, 50, 50),
					"md:sticky md:left-0 bg-background z-20 justify-center",
				),
			},
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(checked) => row.toggleSelected(checked === true)}
					onClick={(event) => event.stopPropagation()}
					aria-label={`Select backlog order ${row.original.orderId}`}
				/>
			),
		},
		{
			id: "createdAt",
			header: "Created",
			accessorKey: "createdAt",
			...sizes.custom(118, 160, 132),
			enableSorting: false,
			meta: {
				headerLabel: "Created",
				sortField: "createdAt",
				className: sizeClass(sizes.custom(118, 160, 132)),
			},
			cell: ({ row }) => (
				<span className="font-medium">
					{formatDate(row.original.createdAt)}
				</span>
			),
		},
		{
			id: "orderId",
			header: "Order / Customer",
			accessorKey: "orderId",
			...sizes.custom(200, 330, 240),
			enableSorting: false,
			enableHiding: false,
			meta: {
				sticky: true,
				headerLabel: "Order / customer",
				className: sizeClass(
					sizes.custom(200, 330, 240),
					"md:sticky md:left-[50px] bg-background z-20",
				),
			},
			cell: ({ row }) => (
				<div className="flex min-w-0 flex-col gap-1">
					<span className="truncate font-mono text-sm font-semibold">
						{row.original.orderId}
					</span>
					<span className="truncate text-xs text-muted-foreground">
						{row.original.customer?.businessName ||
							row.original.customer?.name ||
							"Unnamed customer"}
					</span>
				</div>
			),
		},
		{
			id: "destination",
			header: "Destination",
			...sizes.custom(210, 360, 260),
			enableSorting: false,
			meta: {
				headerLabel: "Destination",
				className: sizeClass(sizes.custom(210, 360, 260)),
			},
			cell: ({ row }) => {
				const address = row.original.shippingAddress;
				const line = [address?.address1, address?.city, address?.state]
					.filter(Boolean)
					.join(", ");
				return <span className="truncate">{line || "Address required"}</span>;
			},
		},
		{
			id: "invoice",
			header: "Invoice",
			...sizes.custom(110, 180, 124),
			enableSorting: false,
			meta: {
				headerLabel: "Invoice",
				className: sizeClass(sizes.custom(110, 180, 124), "text-right"),
			},
			cell: ({ row }) => <SalesOrderInvoiceCell item={row.original} />,
		},
		{
			id: "status",
			header: "Order status",
			...sizes.custom(130, 190, 150),
			enableSorting: false,
			meta: {
				headerLabel: "Order status",
				className: sizeClass(sizes.custom(130, 190, 150)),
			},
			cell: ({ row }) => <SalesOrderStatusCell item={row.original} />,
		},
		{
			id: "actions",
			header: "Actions",
			...sizes.custom(104, 104, 104),
			enableResizing: false,
			enableHiding: false,
			enableSorting: false,
			meta: {
				headerLabel: "Actions",
				className: sizeClass(
					sizes.custom(104, 104, 104),
					"md:sticky md:right-0 bg-background z-20 justify-center",
				),
			},
			cell: ({ row }) => (
				<BacklogActions
					item={row.original}
					onCreateDispatch={onCreateDispatch}
				/>
			),
		},
	];
}
