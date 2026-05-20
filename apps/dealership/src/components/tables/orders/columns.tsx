"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Item as ItemUi } from "@gnd/ui/namespace";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText } from "lucide-react";

export type Item = RouterOutputs["dealerPortal"]["orders"]["data"][number];
type Column = ColumnDef<Item>;

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function date(value?: Date | string | null) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

function customerName(item: Item) {
	return (
		item.customer?.businessName ||
		item.customer?.name ||
		item.customer?.email ||
		"-"
	);
}

export const columns: Column[] = [
	{
		header: "Order",
		accessorKey: "orderId",
		cell: ({ row: { original: item } }) => (
			<div className="inline-flex items-center gap-2 whitespace-nowrap font-medium">
				<FileText className="size-4 text-muted-foreground" />
				<span>{item.orderId}</span>
			</div>
		),
	},
	{
		header: "Customer",
		accessorKey: "customer",
		cell: ({ row: { original: item } }) => (
			<div className="max-w-[260px]">
				<ItemUi.Title>
					<TextWithTooltip
						className="max-w-[220px] truncate"
						text={customerName(item)}
					/>
				</ItemUi.Title>
				<ItemUi.Description>
					<TextWithTooltip
						className="max-w-[220px] truncate"
						text={item.customer?.email || item.customer?.phoneNo || "-"}
					/>
				</ItemUi.Description>
			</div>
		),
	},
	{
		header: "Status",
		accessorKey: "status",
		cell: ({ row: { original: item } }) => (
			<Badge className="capitalize" variant="outline">
				{item.status || "open"}
			</Badge>
		),
	},
	{
		header: "Total",
		accessorKey: "grandTotal",
		cell: ({ row: { original: item } }) => (
			<span className="whitespace-nowrap">{currency(item.grandTotal)}</span>
		),
	},
	{
		header: "Balance",
		accessorKey: "amountDue",
		cell: ({ row: { original: item } }) => (
			<span className="whitespace-nowrap">{currency(item.amountDue)}</span>
		),
	},
	{
		header: "Created",
		accessorKey: "createdAt",
		cell: ({ row: { original: item } }) => (
			<span className="whitespace-nowrap text-muted-foreground">
				{date(item.createdAt)}
			</span>
		),
	},
];

export const mobileColumn: Column[] = [
	{
		header: "Order",
		accessorKey: "order",
		cell: ({ row: { original: item } }) => (
			<div className="flex w-full items-start justify-between gap-3 py-2">
				<div className="min-w-0">
					<ItemUi.Title>
						<TextWithTooltip
							className="max-w-[220px] truncate"
							text={item.orderId || `Order #${item.id}`}
						/>
					</ItemUi.Title>
					<ItemUi.Description>
						<TextWithTooltip
							className="max-w-[240px] truncate"
							text={customerName(item)}
						/>
					</ItemUi.Description>
				</div>
				<div className="shrink-0 text-right">
					<p className="text-sm font-medium">{currency(item.grandTotal)}</p>
					<p className="text-xs text-muted-foreground">{date(item.createdAt)}</p>
				</div>
			</div>
		),
	},
];
