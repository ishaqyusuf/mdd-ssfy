"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import type { ColumnDef } from "@/types/type";
import type { RouterOutputs } from "@api/trpc/routers/_app";

export type Item = RouterOutputs["sales"]["customersIndex"]["data"][number];
interface ItemProps {
	item: Item;
}

function getDisplayName(item: Item) {
	return item.businessName || item.name || "Unnamed customer";
}

function getCustomerAccount(item: Item) {
	return item.phoneNo || `cust-${item.id}`;
}

function getAddressLine(item: Item) {
	return item.address || "No primary address";
}

export const columns: ColumnDef<Item>[] = [
	{
		header: "Customer",
		accessorKey: "customer",
		cell: ({ row: { original: item } }) => (
			<div className="flex flex-col">
				<TCell.Primary className="uppercase">
					{getDisplayName(item)}
				</TCell.Primary>
				<TCell.Secondary className="font-mono$ text-xs">
					{getCustomerAccount(item)}
				</TCell.Secondary>
			</div>
		),
	},
	{
		header: "Contact",
		accessorKey: "contact",
		cell: ({ row: { original: item } }) => (
			<div className="flex flex-col">
				<TCell.Secondary className="uppercase">
					{item.phoneNo || "No primary phone"}
				</TCell.Secondary>
				<TCell.Secondary className="uppercase">
					{item.phoneNo2 || item.email || "No secondary contact"}
				</TCell.Secondary>
			</div>
		),
	},
	{
		header: "Address",
		accessorKey: "address",
		cell: ({ row: { original: item } }) => (
			<div className="max-w-sm">
				<TCell.Secondary className="line-clamp-2 uppercase">
					{getAddressLine(item)}
				</TCell.Secondary>
			</div>
		),
	},
];
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
		<div className="flex flex-col space-y-2 border-b p-3">
			<div>
				<TCell.Primary className="uppercase">
					{getDisplayName(item)}
				</TCell.Primary>
				<TCell.Secondary className="font-mono$ text-xs">
					{getCustomerAccount(item)}
				</TCell.Secondary>
			</div>
			<div className="flex flex-col">
				<TCell.Secondary className="uppercase">
					{item.phoneNo || "No primary phone"}
				</TCell.Secondary>
				<TCell.Secondary className="uppercase">
					{item.phoneNo2 || item.email || "No secondary contact"}
				</TCell.Secondary>
			</div>
			<TCell.Secondary className="line-clamp-2 uppercase">
				{getAddressLine(item)}
			</TCell.Secondary>
		</div>
	);
}
