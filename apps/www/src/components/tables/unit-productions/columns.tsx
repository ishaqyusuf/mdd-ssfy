"use client";

import { Icons } from "@gnd/ui/icons";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import UnitTaskProductionAction from "@/components/_v1/actions/unit-task-production-actions";
import { useUnitProductionParams } from "@/hooks/use-unit-productions-params";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { Progress } from "@gnd/ui/custom/progress";
import { cn } from "@gnd/ui/cn";
import { Item as ListItem } from "@gnd/ui/namespace";
import { formatDate } from "@gnd/utils/dayjs";
import type { ColumnDef } from "@tanstack/react-table";

export type Item =
  RouterOutputs["community"]["getUnitProductions"]["data"][number];

type Column = ColumnDef<Item>;

function getStatusTone(item: Item) {
  if (item.overdue) return "bg-red-100 text-red-700";

  switch ((item.status || "").toLowerCase()) {
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    case "started":
      return "bg-amber-100 text-amber-700";
    case "queued":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

const dueDateColumn: Column = {
  header: "# / Due Date",
  accessorKey: "dueDate",
  meta: {
    sortable: true,
  },
  cell: ({ row: { original: item } }) => (
    <>
      <TCell.Primary>#{item.id}</TCell.Primary>
      <TCell.Secondary>
        {item.productionDueDate ? formatDate(item.productionDueDate) : "No due date"}
      </TCell.Secondary>
    </>
  ),
};

const taskDetailsColumn: Column = {
  header: "Task Details",
  accessorKey: "taskDetails",
  meta: {
    sortable: true,
  },
  cell: ({ row: { original: item } }) => (
    <ListItem className="py-0">
      <ListItem.Title>{item.taskName || "Untitled task"}</ListItem.Title>
      <ListItem.Description>
        {item.home?.lotBlock || "No lot/block"}
      </ListItem.Description>
      <ListItem.Description>
        {item.home?.modelName || "No model"}
      </ListItem.Description>
      <ListItem.Description>
        {item.project?.title || "No project"}
      </ListItem.Description>
    </ListItem>
  ),
};

const statusColumn: Column = {
  header: "Status",
  accessorKey: "status",
  cell: ({ row: { original: item } }) => (
    <div className="w-28">
      <Progress>
        <Progress.Status>{item.status}</Progress.Status>
      </Progress>
      <p className="mt-1 text-xs text-muted-foreground">
        {item.jobCount > 0
          ? `${item.jobCount} installation submission${item.jobCount > 1 ? "s" : ""}`
          : item.productionStatus || "Awaiting production activity"}
      </p>
    </div>
  ),
};

const actionColumn: Column = {
  header: "",
  accessorKey: "action",
  meta: {
    actionCell: true,
    preventDefault: true,
    className: "w-[124px]",
  },
  cell: ({ row: { original: item } }) => (
    <div className="relative z-10 flex items-center justify-end gap-2">
      <UnitTaskProductionAction task={item as any} />
    </div>
  ),
};

export const columns: Column[] = [
  cells.selectColumn,
  dueDateColumn,
  taskDetailsColumn,
  statusColumn,
  actionColumn,
];

export const projectTabColumns: Column[] = [
  dueDateColumn,
  taskDetailsColumn,
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
  const { setParams } = useUnitProductionParams();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => {
            setParams({
              openUnitProductionId: item.id,
            });
          }}
        >
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
              <Icons.Factory className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">
                {item.taskName || "Untitled task"}
              </p>
              <p className="truncate text-sm text-slate-600">
                {item.home?.lotBlock || "No lot/block"} · {item.home?.modelName || "No model"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {item.project?.title || "No project"}
              </p>
            </div>
          </div>
        </button>
        <div className="shrink-0">
          <UnitTaskProductionAction task={item as any} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-slate-200 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            # / Due date
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">#{item.id}</p>
          <p className="mt-1 text-sm text-slate-700">
            {item.productionDueDate ? formatDate(item.productionDueDate) : "Not set"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Project
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {item.project?.title || "No project"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.home?.lotBlock || "No lot/block"} · {item.home?.modelName || "No model"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <span
            className={cn(
              "mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
              getStatusTone(item),
            )}
          >
            {item.overdue ? `${item.status} · Past due` : item.status}
          </span>
          <p className="mt-2 text-xs text-muted-foreground">
            {item.jobCount > 0
              ? `${item.jobCount} installation submission${item.jobCount > 1 ? "s" : ""}`
              : item.productionStatus || "Awaiting production activity"}
          </p>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
            <Icons.FolderKanban className="size-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Reference
            </p>
            <p className="text-sm font-semibold text-slate-900">#{item.id}</p>
          </div>
        </div>
      </div>

      <Button
        type="button"
        className="mt-4 w-full"
        variant="outline"
        onClick={() => {
          setParams({
            openUnitProductionId: item.id,
          });
        }}
      >
        Open Task Context
      </Button>
    </div>
  );
}
