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
function ItemCard({ item }: ItemProps) {
	return (
		<div className="flex flex-col space-y-2 p-3 border-b">
			<div className="flex justify-between items-start">
				<div className="flex flex-col">
					<div className="flex items-center gap-2">
						<TCell.Secondary className="font-bold">
							{item.orderId}
						</TCell.Secondary>
						{!item.orderId?.toUpperCase().endsWith(item.salesRepInitial) && (
							<Badge className="font-mono$ text-xs" variant="secondary">
								{item.salesRepInitial}
							</Badge>
						)}
					</div>
					<TCell.Secondary className="text-xs font-mono$">
						{item?.salesDate}
					</TCell.Secondary>
				</div>
			</div>

			<div>
				<TCell.Primary
					className={cn("font-semibold", item.isBusiness && "text-blue-700")}
				>
					<TextWithTooltip
						className="max-w-full"
						text={item.displayName || "-"}
					/>
				</TCell.Primary>
				{item.poNo && (
					<TCell.Secondary className="text-xs">
						P.O: {item.poNo}
					</TCell.Secondary>
				)}
			</div>

			<div className="text-xs text-muted-foreground">
				<TextWithTooltip className="max-w-full" text={item?.address} />
				<div>{item?.customerPhone}</div>
			</div>

			<div className="flex justify-between items-center border-t pt-2 mt-2">
				<div>
					<div className="text-xs text-muted-foreground">Invoice</div>
					<TCell.Money
						value={item.invoice.total}
						className="font-mono$ font-bold"
					/>
				</div>
			</div>
		</div>
	);
}
