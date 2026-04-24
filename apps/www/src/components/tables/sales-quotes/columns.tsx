"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@/types/type";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";

import { SuperAdminGuard } from "@/components/auth-guard";
import { SalesFormVersionMenuItems } from "@/components/sales-form-version-menu-items";
import { SalesMenu } from "@/components/sales-menu";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { Icons } from "@gnd/ui/icons";
import { Item as ListItem } from "@gnd/ui/namespace";

export type Item = RouterOutputs["sales"]["quotes"]["data"][number];
interface ItemProps {
	item: Item;
}
export const columns: ColumnDef<Item>[] = [
	cells.selectColumn,
	{
		header: "Date",
		accessorKey: "quoteDate",
		meta: {},
		cell: ({ row: { original: item } }) => (
			<TCell.Secondary className="font-mono$">
				{item?.salesDate}
			</TCell.Secondary>
		),
	},
	{
		header: "Quote #",
		accessorKey: "quoteId",
		cell: ({ row: { original: item } }) => (
			<TCell.Secondary className="whitespace-nowrap">
				{item.orderId}
				{!item.orderId?.toUpperCase().endsWith(item.salesRepInitial) && (
					<Badge className="font-mono$" variant="secondary">
						{item.salesRepInitial}
					</Badge>
				)}
			</TCell.Secondary>
		),
	},
	{
		header: "P.O",
		accessorKey: "po",
		meta: {
			className: "",
		},
		cell: ({ row: { original: item } }) => <div>{item?.poNo}</div>,
	},
	{
		header: "Customer",
		accessorKey: "customer",
		cell: ({ row: { original: item } }) => (
			<TCell.Primary
				className={cn(
					item.isBusiness && "text-blue-700",
					"whitespace-nowrap uppercase",
				)}
			>
				<TextWithTooltip
					className="max-w-[100px] xl:max-w-[200px]"
					text={item.displayName || "-"}
				/>
			</TCell.Primary>
		),
	},
	{
		header: "Phone",
		accessorKey: "phone",
		cell: ({ row: { original: item } }) => (
			<TCell.Secondary className="whitespace-nowrap">
				<TextWithTooltip
					className="max-w-[85px] xl:max-w-[120px]"
					text={item?.customerPhone || "-"}
				/>
			</TCell.Secondary>
		),
	},
	{
		header: "Address",
		accessorKey: "address",
		cell: ({ row: { original: item } }) => (
			<TCell.Secondary>
				<TextWithTooltip
					className="max-w-[100px] xl:max-w-[200px]"
					text={item?.address}
				/>
			</TCell.Secondary>
		),
	},
	{
		header: "Invoice",
		accessorKey: "invoice",
		cell: ({ row: { original: item } }) => (
			<div>
				<TCell.Money value={item.invoice.total} className="font-mono$" />
			</div>
		),
	},

	{
		header: "",
		accessorKey: "action",
		meta: {
			actionCell: true,
			preventDefault: true,
		},
		cell: ({ row: { original: item } }) => (
			<div className="flex gap-4">
				<QuoteActions item={item} />
			</div>
		),
	},
];

function QuoteActions({ item }: { item: Item }) {
	return (
		<SalesMenu
			id={item.id}
			slug={item.slug}
			type="quote"
			trigger={
				<Button size="xs" variant="outline">
					<Icons.MoreHoriz className="size-4 text-muted-foreground" />
				</Button>
			}
		>
			<SalesFormVersionMenuItems
				slug={item.slug}
				type="quote"
				uuid={item.uuid}
				includeOverviewV2
			/>
			<SalesMenu.QuoteEmailMenuItems />
			<SuperAdminGuard>
				<SalesMenu.PrintModes />
			</SuperAdminGuard>
			<SalesMenu.Copy />
			<SalesMenu.Move />
		</SalesMenu>
	);
}
export const mobileColumn: ColumnDef<Item>[] = [
	{
		header: "",
		accessorKey: "row",
		meta: {
			className: "flex-1 p-0",
		},
		cell: ({ row: { original: item } }) => {
			return <ItemCard item={item} />;
		},
	},
];

function getInvoiceStatusLabel(item: Item) {
	if (item.invoice.pending <= 0) return "Paid";
	if (item.invoice.pending >= item.invoice.total) return "Open";
	return "Part paid";
}

function getInvoiceToneClass(item: Item) {
	if (item.invoice.pending <= 0) {
		return "border-emerald-200 bg-emerald-50 text-emerald-700";
	}
	if (item.invoice.pending >= item.invoice.total) {
		return "border-slate-200 bg-slate-50 text-slate-700";
	}
	return "border-amber-200 bg-amber-50 text-amber-700";
}

function ItemCard({ item }: ItemProps) {
	return (
		<ListItem
			variant="outline"
			size="sm"
			className="items-start rounded-none border-x-0 border-t-0 border-b border-border/70 bg-background px-3 py-3"
		>
			<ListItem.Header className="items-start gap-3">
				<div className="min-w-0 space-y-1">
					<div className="text-[11px] font-medium uppercase text-muted-foreground">
						Quote
					</div>
					<ListItem.Title className="w-full max-w-full gap-1.5 font-mono text-[13px] text-foreground uppercase">
						<span className="truncate">{item.orderId}</span>
						{!item.orderId?.toUpperCase().endsWith(item.salesRepInitial) && (
							<Badge
								className="rounded-md px-1.5 py-0 text-[10px]"
								variant="secondary"
							>
								{item.salesRepInitial}
							</Badge>
						)}
						{!item.noteCount || (
							<Badge className="h-5 rounded-md px-1.5 py-0" variant="secondary">
								<Icons.StickyNote className="mr-1 size-3" />
								<span>{item.noteCount}</span>
							</Badge>
						)}
					</ListItem.Title>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Badge
						variant="outline"
						className={cn(
							"rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase",
							getInvoiceToneClass(item),
						)}
					>
						{getInvoiceStatusLabel(item)}
					</Badge>
					<div
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
						}}
					>
						<QuoteActions item={item} />
					</div>
				</div>
			</ListItem.Header>

			<ListItem.Content className="min-w-0 gap-2">
				<ListItem.Title
					className={cn("font-semibold", item.isBusiness && "text-blue-700")}
				>
					<TextWithTooltip
						className="max-w-full truncate"
						text={item.displayName || "-"}
					/>
				</ListItem.Title>

				<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs">
					<div className="min-w-0 space-y-1 text-muted-foreground">
						<div className="flex min-w-0 items-center gap-1.5">
							<Icons.Calendar className="size-3.5 shrink-0" />
							<span className="truncate text-foreground">
								{item.salesDate || "No date"}
							</span>
						</div>
						<div className="flex min-w-0 items-center gap-1.5">
							<Icons.Phone className="size-3.5 shrink-0" />
							<span className="truncate">{item.customerPhone || "No phone"}</span>
						</div>
						<div className="flex min-w-0 items-center gap-1.5">
							<Icons.MapPin className="size-3.5 shrink-0" />
							<TextWithTooltip
								className="max-w-full truncate"
								text={item.address || "No address"}
							/>
						</div>
					</div>

					<div className="min-w-[88px] text-right">
						<div className="text-[11px] uppercase text-muted-foreground">
							Invoice
						</div>
						<TCell.Money
							value={item.invoice.total}
							className="mt-0.5 block text-sm font-semibold text-foreground"
						/>
						{item.poNo && (
							<div className="mt-1 max-w-[100px] truncate text-[11px] text-muted-foreground">
								PO {item.poNo}
							</div>
						)}
					</div>
				</div>
			</ListItem.Content>
		</ListItem>
	);
}
