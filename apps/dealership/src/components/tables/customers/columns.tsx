"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Item as ItemUi } from "@gnd/ui/namespace";
import type { ColumnDef } from "@tanstack/react-table";
import { FilePlus2 } from "lucide-react";
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

function overviewHref(item: Item) {
  return `/customers?customerOverviewId=${item.id}&customerOverviewTab=overview`;
}

function profileName(item: Item) {
  if (!item.profile) return "-";

  const percentage = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(item.profile.salesPercentage || 0));

  return `${item.profile.title || `Profile #${item.profile.id}`} (${percentage}%)`;
}

function countLabel(value: number, singular: string) {
  return `${value} ${value === 1 ? singular : `${singular}s`}`;
}

function CreateQuoteAction({ item }: { item: Item }) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={`/quotes/new?selectedCustomerId=${item.id}`}>
        <FilePlus2 className="mr-2 size-4" />
        <span>Create quote</span>
      </Link>
    </Button>
  );
}

export const columns: Column[] = [
  {
    header: "Customer",
    accessorKey: "customer",
    cell: ({ row: { original: item } }) => (
      <div className="max-w-[260px]">
        <ItemUi.Title>
          <Link href={overviewHref(item)}>
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
    cell: ({ row: { original: item } }) => (
      <span className="whitespace-nowrap">{profileName(item)}</span>
    ),
  },
  {
    header: "Quotes",
    accessorKey: "quotesCount",
    cell: ({ row: { original: item } }) => (
      <span className="whitespace-nowrap tabular-nums">
        {item.quotesCount ?? 0}
      </span>
    ),
  },
  {
    header: "Orders",
    accessorKey: "ordersCount",
    cell: ({ row: { original: item } }) => (
      <span className="whitespace-nowrap tabular-nums">
        {item.ordersCount ?? 0}
      </span>
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
    cell: ({ row: { original: item } }) => (
      <div className="flex justify-end">
        <CreateQuoteAction item={item} />
      </div>
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
            <Link href={overviewHref(item)}>
              <TextWithTooltip
                className="max-w-[220px] truncate"
                text={customerName(item)}
              />
            </Link>
          </ItemUi.Title>
          <ItemUi.Description>
            <TextWithTooltip
              className="max-w-[240px] truncate"
              text={`${profileName(item)} / ${countLabel(
                item.quotesCount ?? 0,
                "quote",
              )} / ${countLabel(item.ordersCount ?? 0, "order")}`}
            />
          </ItemUi.Description>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-xs text-muted-foreground">
            {date(item.createdAt)}
          </p>
          <CreateQuoteAction item={item} />
        </div>
      </div>
    ),
  },
];
