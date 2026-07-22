"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/dealership-app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { DropdownMenu, Item as ItemUi } from "@gnd/ui/namespace";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, MoreHorizontal, Printer } from "lucide-react";
import Link from "next/link";
import { DealerRequestTimeline } from "../../dealer-portal/dealer-request-timeline";

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

function requestStatusLabel(status?: string | null) {
	if (status === "pending") return "Order requested";
	if (status === "approved") return "Approved";
	if (status === "rejected") return "Rejected";
	return "Draft";
}

function quoteEditHref(item: Pick<Item, "id" | "orderId">) {
	return `/quotes/${encodeURIComponent(item.orderId || String(item.id))}/edit`;
}

function QuoteActions({ item }: { item: Item }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const printDocument = useMutation(
		trpc.dealerPortal.printDocument.mutationOptions({
			onSuccess: (result) => {
				window.location.assign(result.previewUrl);
			},
			onError: (error) => {
				toast({
					title: "Could not open print preview.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const requestOrder = useMutation(
		trpc.dealerPortal.requestQuoteOrder.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.quotes.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.orders.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.customersList.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.dashboard.pathKey(),
					}),
				]);
				toast({
					title: "Order request sent.",
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Could not request order.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const isPendingRequest = item.requestStatus === "pending";
	const isClosedRequest =
		item.requestStatus === "approved" || item.requestStatus === "rejected";

	return (
		<div className="flex justify-end gap-2">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<Button
						aria-label={`Actions for quote ${item.orderId || item.id}`}
						size="sm"
						type="button"
						variant="ghost"
					>
						<MoreHorizontal className="size-4" />
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" className="w-[190px]">
					<DropdownMenu.Item asChild>
						<Link href={quoteEditHref(item)}>Edit</Link>
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item
						disabled={printDocument.isPending}
						onSelect={(event) => {
							event.preventDefault();
							printDocument.mutate({
								id: item.id,
								mode: "quote",
								pricingMode: "customer",
							});
						}}
					>
						<Printer className="mr-2 size-4" />
						Print customer
					</DropdownMenu.Item>
					<DropdownMenu.Item
						disabled={printDocument.isPending}
						onSelect={(event) => {
							event.preventDefault();
							printDocument.mutate({
								id: item.id,
								mode: "quote",
								pricingMode: "internal",
							});
						}}
					>
						<Printer className="mr-2 size-4" />
						Print internal
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<Button
				disabled={requestOrder.isPending || isPendingRequest || isClosedRequest}
				onClick={() => requestOrder.mutate({ id: item.id })}
				size="sm"
				type="button"
				variant="outline"
			>
				{isPendingRequest ? "Requested" : "Request order"}
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
			<div>
				<Badge className="capitalize" variant="outline">
					{requestStatusLabel(item.requestStatus) || item.status || "open"}
				</Badge>
				<DealerRequestTimeline
					status={item.requestStatus}
					requestedAt={item.requestCreatedAt}
					decisionAt={item.requestDecisionAt}
					decisionNote={item.requestDecisionNote}
				/>
			</div>
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
					<p className="text-xs text-muted-foreground">
						{date(item.createdAt)}
					</p>
				</div>
			</div>
		),
	},
];
