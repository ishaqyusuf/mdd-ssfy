"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Item as ItemUi } from "@gnd/ui/namespace";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type Item =
	RouterOutputs["dealerPortal"]["customersList"]["data"][number];
type Column = ColumnDef<Item>;

function date(value?: Date | string | null) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

function customerName(item: Item) {
	return item.businessName || item.name || item.email || `Customer #${item.id}`;
}

export const columns: Column[] = [
	{
		header: "Customer",
		accessorKey: "customer",
		cell: ({ row: { original: item } }) => (
			<div className="max-w-[260px]">
				<ItemUi.Title>
					<Link href={`/customers/${item.id}/edit`}>
						<TextWithTooltip
							className="max-w-[220px] truncate"
							text={customerName(item)}
						/>
					</Link>
				</ItemUi.Title>
				<ItemUi.Description>
					<TextWithTooltip
						className="max-w-[220px] truncate"
						text={item.address || "-"}
					/>
				</ItemUi.Description>
			</div>
		),
	},
	{
		header: "Email",
		accessorKey: "email",
		cell: ({ row: { original: item } }) => (
			<span className="whitespace-nowrap">{item.email || "-"}</span>
		),
	},
	{
		header: "Phone",
		accessorKey: "phoneNo",
		cell: ({ row: { original: item } }) => (
			<span className="whitespace-nowrap">{item.phoneNo || "-"}</span>
		),
	},
	{
		header: "Profile",
		accessorKey: "profile",
		cell: ({ row: { original: item } }) => item.profile?.title || "-",
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
		header: "Customer",
		accessorKey: "customer",
		cell: ({ row: { original: item } }) => (
			<div className="flex w-full items-start justify-between gap-3 py-2">
				<div className="min-w-0">
					<ItemUi.Title>
						<Link href={`/customers/${item.id}/edit`}>
							<TextWithTooltip
								className="max-w-[220px] truncate"
								text={customerName(item)}
							/>
						</Link>
					</ItemUi.Title>
					<ItemUi.Description>
						<TextWithTooltip
							className="max-w-[240px] truncate"
							text={item.email || item.phoneNo || "-"}
						/>
					</ItemUi.Description>
				</div>
				<p className="shrink-0 text-xs text-muted-foreground">
					{date(item.createdAt)}
				</p>
			</div>
		),
	},
];
