"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Badge } from "@gnd/ui/badge";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { Item as ListItem } from "@gnd/ui/namespace";
import { cn } from "@gnd/ui/cn";
import { formatCurrency } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, ClipboardList, Truck } from "lucide-react";

export type Item = RouterOutputs["sales"]["getOrdersV2"]["data"][number];

type Column = ColumnDef<Item>;

function toneForInvoice(status: Item["invoiceStatus"]) {
  return status === "paid"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-700";
}

function toneForProduction(status: Item["productionState"]) {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    case "in progress":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

const orderColumn: Column = {
  header: "Order",
  accessorKey: "order",
  cell: ({ row: { original: item } }) => (
    <>
      <TCell.Primary>{item.orderId}</TCell.Primary>
      <TCell.Secondary>{item.salesDate}</TCell.Secondary>
    </>
  ),
};

const customerColumn: Column = {
  header: "Customer",
  accessorKey: "customer",
  cell: ({ row: { original: item } }) => (
    <ListItem className="py-0">
      <ListItem.Title>{item.customerName}</ListItem.Title>
      <ListItem.Description>{item.customerPhone}</ListItem.Description>
      <ListItem.Description>{item.address}</ListItem.Description>
    </ListItem>
  ),
};

const commercialColumn: Column = {
  header: "Commercial",
  accessorKey: "commercial",
  cell: ({ row: { original: item } }) => (
    <>
      <TCell.Primary>{formatCurrency.format(item.invoiceTotal)}</TCell.Primary>
      <TCell.Secondary className="flex items-center gap-2">
        <span>Due {formatCurrency.format(item.amountDue)}</span>
        <span>·</span>
        <span>{item.salesRepName}</span>
      </TCell.Secondary>
    </>
  ),
};

const statusColumn: Column = {
  header: "Status",
  accessorKey: "status",
  cell: ({ row: { original: item } }) => (
    <div className="flex flex-col gap-2">
      <Badge className={cn("w-fit border-0", toneForInvoice(item.invoiceStatus))}>
        {item.invoiceStatus === "paid" ? "Paid" : "Outstanding"}
      </Badge>
      <Badge
        variant="secondary"
        className={cn("w-fit border-0", toneForProduction(item.productionState))}
      >
        {item.productionLabel}
      </Badge>
      <p className="text-xs text-muted-foreground">{item.fulfillmentLabel}</p>
    </div>
  ),
};

const actionColumn: Column = {
  header: "",
  accessorKey: "action",
  meta: {
    actionCell: true,
    preventDefault: true,
    className: "w-[110px]",
  },
  cell: ({ row: { original: item } }) => <OpenButton item={item} />,
};

function OpenButton({ item }: { item: Item }) {
  const overviewQuery = useSalesOverviewQuery();

  return (
    <div className="relative z-10 flex items-center justify-end">
      <Button
        variant="outline"
        size="sm"
        onClick={() => overviewQuery.open2(item.uuid, "sales")}
      >
        <ArrowUpRight className="mr-2 size-4" />
        Open
      </Button>
    </div>
  );
}

export const columns: Column[] = [
  cells.selectColumn,
  orderColumn,
  customerColumn,
  commercialColumn,
  statusColumn,
  actionColumn,
];

export const mobileColumn: ColumnDef<Item>[] = [
  {
    header: "",
    accessorKey: "row",
    meta: {
      className: "flex-1 p-0",
    },
    cell: ({ row: { original: item } }) => <ItemCard item={item} />,
  },
];

function ItemCard({ item }: { item: Item }) {
  const overviewQuery = useSalesOverviewQuery();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        className="flex w-full items-start gap-3 text-left"
        onClick={() => overviewQuery.open2(item.uuid, "sales")}
      >
        <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
          <ClipboardList className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-slate-900">
            {item.orderId}
          </p>
          <p className="truncate text-sm text-slate-600">{item.customerName}</p>
          <p className="truncate text-xs text-slate-500">{item.address}</p>
        </div>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-slate-200 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Invoice
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatCurrency.format(item.invoiceTotal)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Due {formatCurrency.format(item.amountDue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sales rep
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {item.salesRepName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{item.salesDate}</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
            <Truck className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className={cn("border-0", toneForInvoice(item.invoiceStatus))}>
                {item.invoiceStatus === "paid" ? "Paid" : "Outstanding"}
              </Badge>
              <Badge
                variant="secondary"
                className={cn("border-0", toneForProduction(item.productionState))}
              >
                {item.productionLabel}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {item.fulfillmentLabel}
            </p>
          </div>
        </div>
      </div>

      <Button
        type="button"
        className="mt-4 w-full"
        variant="outline"
        onClick={() => overviewQuery.open2(item.uuid, "sales")}
      >
        Open Order
      </Button>
    </div>
  );
}
