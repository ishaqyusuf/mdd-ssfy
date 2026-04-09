"use client";

import { Icons } from "@gnd/ui/icons";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { formatCurrency } from "@/lib/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { HoverCard } from "@gnd/ui/namespace";
import type { ColumnDef } from "@tanstack/react-table";

export type Item = RouterOutputs["sales"]["getOrdersV2"]["data"][number];

type Column = ColumnDef<Item>;

function smartStatusTone(status: Item["smartStatus"]) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    case "transit":
      return "bg-sky-100 text-sky-700";
    case "ready":
      return "bg-violet-100 text-violet-700";
    case "queued":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function amountTone(item: Item) {
  if (item.amountDue === item.invoiceTotal) return "text-red-600";
  if (item.amountDue > 0) return "text-violet-600";
  return "text-emerald-600";
}

function paymentHint(item: Item) {
  if (item.amountDue === item.invoiceTotal) return "Unpaid";
  if (item.amountDue > 0) return `Due ${formatCurrency.format(item.amountDue)}`;
  return "Paid";
}

const invoiceIdColumn: Column = {
  header: "Invoice ID",
  accessorKey: "orderId",
  cell: ({ row: { original: item } }) => (
    <TCell.Primary className="font-medium">{item.orderId}</TCell.Primary>
  ),
};

const customerColumn: Column = {
  header: "Customer",
  accessorKey: "customerName",
  cell: ({ row: { original: item } }) => (
    <TCell.Primary className="truncate">{item.customerName}</TCell.Primary>
  ),
};

const refColumn: Column = {
  header: "Ref",
  accessorKey: "poNo",
  cell: ({ row: { original: item } }) => (
    <TCell.Secondary>{item.poNo === "-" ? "-" : item.poNo}</TCell.Secondary>
  ),
};

const dateColumn: Column = {
  header: "Date",
  accessorKey: "salesDate",
  cell: ({ row: { original: item } }) => (
    <TCell.Secondary>{item.salesDate}</TCell.Secondary>
  ),
};

const amountColumn: Column = {
  header: "Payment",
  accessorKey: "invoiceTotal",
  cell: ({ row: { original: item } }) => (
    <div className="text-right">
      <TCell.Primary className={cn("font-medium", amountTone(item))}>
        {formatCurrency.format(item.invoiceTotal)}
      </TCell.Primary>
    </div>
  ),
};

const statusColumn: Column = {
  header: "Status",
  accessorKey: "smartStatus",
  cell: ({ row: { original: item } }) => (
    <div className="flex items-center">
      <Badge className={cn("border-0", smartStatusTone(item.smartStatus))}>
        {item.smartStatusLabel}
      </Badge>
    </div>
  ),
};

const actionColumn: Column = {
  header: "Actions",
  accessorKey: "action",
  meta: {
    actionCell: true,
    preventDefault: true,
    className: "w-[86px]",
  },
  cell: ({ row: { original: item } }) => <ActionCell item={item} />,
};

export const columns: Column[] = [
  cells.selectColumn,
  invoiceIdColumn,
  customerColumn,
  refColumn,
  dateColumn,
  amountColumn,
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

function ActionCell({ item }: { item: Item }) {
  const overviewQuery = useSalesOverviewQuery();

  return (
    <div className="relative z-10 flex items-center justify-end gap-2">
      <HoverCard.Root openDelay={120} closeDelay={80}>
        <HoverCard.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <Icons.Eye className="size-4" />
            <span className="sr-only">Preview order</span>
          </Button>
        </HoverCard.Trigger>
        <HoverCard.Content
          align="end"
          side="left"
          sideOffset={10}
          className="w-[300px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {item.customerName}
                </p>
                <p className="mt-1 text-xs text-slate-500">{item.orderId}</p>
              </div>
              <Badge className={cn("border-0", smartStatusTone(item.smartStatus))}>
                {item.smartStatusLabel}
              </Badge>
            </div>

            <div className="space-y-2.5 text-sm">
              <OverviewLine
                label="Amount"
                value={formatCurrency.format(item.invoiceTotal)}
                valueClassName={amountTone(item)}
              />
              <OverviewLine label="Payment" value={paymentHint(item)} />
              <OverviewLine label="Customer" value={item.customerPhone || "-"} />
              <OverviewLine label="Sales Rep" value={item.salesRepName} />
              <OverviewLine label="Production" value={item.productionLabel} />
              <OverviewLine label="Fulfillment" value={item.fulfillmentLabel} />
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="line-clamp-2 text-xs leading-5 text-slate-500">
                {item.address}
              </p>
            </div>
          </div>
        </HoverCard.Content>
      </HoverCard.Root>

      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        onClick={(event) => {
          event.stopPropagation();
          overviewQuery.open2(item.uuid, "sales");
        }}
      >
        <Icons.ArrowUpRight className="size-4" />
        <span className="sr-only">Open order</span>
      </Button>
    </div>
  );
}

function OverviewLine({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <span className={cn("truncate text-right font-medium text-slate-700", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

function ItemCard({ item }: { item: Item }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{item.orderId}</p>
          <p className="truncate text-sm text-slate-600">{item.customerName}</p>
          <p className="mt-1 text-xs text-slate-500">{item.salesDate}</p>
        </div>
        <Badge className={cn("border-0", smartStatusTone(item.smartStatus))}>
          {item.smartStatusLabel}
        </Badge>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className={cn("text-base font-semibold", amountTone(item))}>
            {formatCurrency.format(item.invoiceTotal)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActionCell item={item} />
        </div>
      </div>
    </div>
  );
}
