"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Item as ItemUi } from "@gnd/ui/namespace";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText } from "lucide-react";
import Link from "next/link";

export type Item = RouterOutputs["dealerPortal"]["quotes"]["data"][number];
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

function QuoteActions({ item }: { item: Item }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const convertQuote = useMutation(
		trpc.dealerPortal.convertQuoteToOrder.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.quotes.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.orders.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.dashboard.pathKey(),
					}),
				]);
				toast({
					title: "Quote converted to order.",
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Could not convert quote.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	return (
		<div className="flex justify-end gap-2">
			<Button asChild size="sm" variant="ghost">
				<Link href={`/quotes/${item.id}/edit`}>Edit</Link>
			</Button>
			<Button
				disabled={convertQuote.isPending}
				onClick={() => convertQuote.mutate({ id: item.id })}
				size="sm"
				type="button"
				variant="outline"
			>
				Convert
			</Button>
		</div>
	);
}

export const columns: Column[] = [
	{
		header: "Quote",
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
		header: "Created",
		accessorKey: "createdAt",
		cell: ({ row: { original: item } }) => (
			<span className="whitespace-nowrap text-muted-foreground">
				{date(item.createdAt)}
			</span>
		),
	},
	{
		header: "",
		accessorKey: "actions",
		cell: ({ row: { original: item } }) => <QuoteActions item={item} />,
	},
];

export const mobileColumn: Column[] = [
	{
		header: "Quote",
		accessorKey: "quote",
		cell: ({ row: { original: item } }) => (
			<div className="flex w-full items-start justify-between gap-3 py-2">
				<div className="min-w-0">
					<ItemUi.Title>
						<TextWithTooltip
							className="max-w-[220px] truncate"
							text={item.orderId || `Quote #${item.id}`}
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
