"use client";

import { useSalesProfileFormParams } from "@/hooks/use-sales-profile-form-params";
import type { RouterOutputs } from "@api/trpc/routers/dealership-app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Item as ItemUi } from "@gnd/ui/namespace";
import type { ColumnDef } from "@tanstack/react-table";

export type Item = RouterOutputs["dealerPortal"]["salesProfiles"][number];
type Column = ColumnDef<Item>;

function date(value?: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function ProfileActions({ item }: { item: Item }) {
  const profileForm = useSalesProfileFormParams();

  return (
    <Button
      onClick={() => profileForm.openEdit(item.id)}
      size="sm"
      type="button"
      variant="outline"
    >
      Edit
    </Button>
  );
}

export const columns: Column[] = [
  {
    header: "Profile",
    accessorKey: "profile",
    cell: ({ row: { original: item } }) => (
      <div className="max-w-[260px]">
        <ItemUi.Title>
          <TextWithTooltip
            className="max-w-[220px] truncate"
            text={item.title || `Profile #${item.id}`}
          />
        </ItemUi.Title>
        <ItemUi.Description>
          {item.defaultProfile ? "Default profile" : "Sales pricing profile"}
        </ItemUi.Description>
      </div>
    ),
  },
  {
    header: "Percentage",
    accessorKey: "salesPercentage",
    cell: ({ row: { original: item } }) => (
      <span className="whitespace-nowrap">
        {item.salesPercentage != null ? `${item.salesPercentage}%` : "-"}
      </span>
    ),
  },
  {
    header: "Customers",
    accessorKey: "customers",
    cell: ({ row: { original: item } }) => item._count.customers,
  },
  {
    header: "Default",
    accessorKey: "defaultProfile",
    cell: ({ row: { original: item } }) =>
      item.defaultProfile ? <Badge variant="outline">Default</Badge> : "-",
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
    header: "Actions",
    accessorKey: "actions",
    cell: ({ row: { original: item } }) => (
      <div className="text-right">
        <ProfileActions item={item} />
      </div>
    ),
  },
];

export const mobileColumn: Column[] = [
  {
    header: "Profile",
    accessorKey: "profile",
    cell: ({ row: { original: item } }) => (
      <div className="flex w-full items-start justify-between gap-3 py-2">
        <div className="min-w-0">
          <ItemUi.Title>
            <TextWithTooltip
              className="max-w-[220px] truncate"
              text={item.title || `Profile #${item.id}`}
            />
          </ItemUi.Title>
          <ItemUi.Description>
            {item.salesPercentage != null
              ? `${item.salesPercentage}% sales adjustment`
              : "No sales adjustment"}
          </ItemUi.Description>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-xs text-muted-foreground">
            {date(item.createdAt)}
          </p>
          <ProfileActions item={item} />
        </div>
      </div>
    ),
  },
];
