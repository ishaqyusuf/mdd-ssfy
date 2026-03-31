"use client";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import Money from "@/components/_v1/money";
import { useUnitInvoiceParams } from "@/hooks/use-unit-invoice-params";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Progress } from "@gnd/ui/custom/progress";
import { Menu } from "@gnd/ui/custom/menu";
import { cn } from "@gnd/ui/cn";
import { formatDate } from "@gnd/utils/dayjs";
import type { ColumnDef } from "@tanstack/react-table";
import { FilePenLine, ReceiptText } from "lucide-react";

export type Item = RouterOutputs["community"]["getUnitInvoices"]["data"][number];

type Column = ColumnDef<Item>;

function getStatusTone(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    case "started":
      return "bg-amber-100 text-amber-700";
    case "queued":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

const dateColumn: Column = {
  header: "Date",
  accessorKey: "date",
  meta: {
    sortable: true,
  },
  cell: ({ row: { original: item } }) => (
    <TCell.Primary>{formatDate(item.createdAt)}</TCell.Primary>
  ),
};

const projectColumn: Column = {
  header: "Project",
  accessorKey: "project",
  meta: {
    sortable: true,
  },
  cell: ({ row: { original: item } }) => (
    <>
      <TCell.Primary>{item.project?.title}</TCell.Primary>
      <TCell.Secondary>{item.project?.builder?.name}</TCell.Secondary>
    </>
  ),
};

const unitColumn: Column = {
  header: "Unit",
  accessorKey: "lotBlock",
  meta: {
    sortable: true,
  },
  cell: ({ row: { original: item } }) => (
    <>
      <TCell.Primary>{item.lotBlock}</TCell.Primary>
      <TCell.Secondary>{item.modelName}</TCell.Secondary>
    </>
  ),
};

const statusColumn: Column = {
  header: "Status",
  accessorKey: "production",
  cell: ({ row: { original: item } }) => (
    <div className="w-28">
      <Progress>
        <Progress.Status>
          {item.jobCount ? "Installed" : `Prod. ${item.production?.status}`}
        </Progress.Status>
      </Progress>
      <p className="mt-1 text-xs text-muted-foreground">
        {item.production?.date || `${item.jobCount} submissions`}
      </p>
    </div>
  ),
};

const invoiceColumn: Column = {
  header: "Invoice",
  accessorKey: "invoice",
  cell: ({ row: { original: item } }) => (
    <div className="flex flex-col items-end">
      <Money className="text-orange-600" value={item.invoice?.due} />
      <Money className="text-emerald-600" value={item.invoice?.paid} />
      {!!item.invoice?.chargeBack && item.invoice.chargeBack < 0 ? (
        <Money className="text-red-600" value={item.invoice.chargeBack} />
      ) : null}
    </div>
  ),
};

const actionColumn: Column = {
  header: "",
  accessorKey: "action",
  meta: {
    actionCell: true,
    preventDefault: true,
    className: "w-[88px]",
  },
  cell: ({ row: { original: item } }) => <Actions item={item} />,
};

export const columns: Column[] = [
  dateColumn,
  projectColumn,
  unitColumn,
  statusColumn,
  invoiceColumn,
  actionColumn,
];

export const projectTabColumns: Column[] = [
  dateColumn,
  unitColumn,
  statusColumn,
  invoiceColumn,
  actionColumn,
];

function Actions({ item }: { item: Item }) {
  const { setParams } = useUnitInvoiceParams();

  return (
    <div className="relative z-10 flex items-center justify-end gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 px-2"
        onClick={() => {
          setParams({
            editUnitInvoiceId: item.id,
          });
        }}
      >
        <FilePenLine className="size-4" />
      </Button>
      <Menu>
        <Menu.Item
          icon="edit"
          onClick={() => {
            setParams({
              editUnitInvoiceId: item.id,
            });
          }}
        >
          Edit Invoice
        </Menu.Item>
      </Menu>
    </div>
  );
}

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
  const { setParams } = useUnitInvoiceParams();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => {
            setParams({
              editUnitInvoiceId: item.id,
            });
          }}
        >
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <ReceiptText className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">
                {item.lotBlock}
              </p>
              <p className="truncate text-sm text-slate-600">{item.modelName}</p>
            </div>
          </div>
        </button>
        <Actions item={item} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Project
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {item.project?.title}
        </p>
        <p className="text-xs text-muted-foreground">{item.project?.builder?.name}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-slate-200 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <span
            className={cn(
              "mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
              getStatusTone(item.jobCount ? "completed" : item.production?.status),
            )}
          >
            {item.jobCount ? "Installed" : item.production?.status || "Idle"}
          </span>
          <p className="mt-2 text-xs text-muted-foreground">
            {item.production?.date || `${item.jobCount} submissions`}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Updated
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatDate(item.createdAt)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.tasks?.length || 0} invoice tasks
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-orange-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700/80">
            Total Due
          </p>
          <Money className="mt-2 text-lg font-semibold text-orange-700" value={item.invoice?.due} />
        </div>
        <div className="rounded-2xl bg-emerald-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700/80">
            Total Paid
          </p>
          <Money className="mt-2 text-lg font-semibold text-emerald-700" value={item.invoice?.paid} />
        </div>
      </div>

      <Button
        type="button"
        className="mt-4 w-full"
        onClick={() => {
          setParams({
            editUnitInvoiceId: item.id,
          });
        }}
      >
        Open Invoice
      </Button>
    </div>
  );
}
