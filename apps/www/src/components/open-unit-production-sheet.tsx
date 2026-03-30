"use client";

import { useUnitProductionParams } from "@/hooks/use-unit-productions-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import { formatDate } from "@gnd/utils/dayjs";
import { CircleCheck, Clock3, FolderKanban, Hammer, Warehouse } from "lucide-react";

function tone(status?: string, overdue?: boolean) {
  if (overdue) return "border-red-200 bg-red-50 text-red-700";

  switch ((status || "").toLowerCase()) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "started":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "queued":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function OverviewContent({ id }: { id: number }) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.community.getUnitProductionOverview.queryOptions({ id }),
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate text-lg text-slate-950">
                {data.taskName || "Untitled task"}
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                #{data.id}
                {data.home?.lotBlock ? ` · ${data.home.lotBlock}` : ""}
                {data.home?.modelName ? ` · ${data.home.modelName}` : ""}
              </p>
              <p className="text-sm text-slate-500">
                {data.project?.title || "No project"}
              </p>
            </div>
            <Badge variant="outline" className={tone(data.status, data.overdue)}>
              {data.overdue ? `${data.status} · Past due` : data.status}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-700">Task Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <FolderKanban className="size-4 text-slate-400" />
              <span>{data.project?.title || "No project"}</span>
            </p>
            <p className="flex items-center gap-2">
              <Warehouse className="size-4 text-slate-400" />
              <span>{data.home?.lotBlock || "No lot/block"}</span>
            </p>
            <p className="flex items-center gap-2">
              <Hammer className="size-4 text-slate-400" />
              <span>{data.home?.modelName || "No model"}</span>
            </p>
            <p className="flex items-center gap-2">
              <Clock3 className="size-4 text-slate-400" />
              <span>
                Due {data.productionDueDate ? formatDate(data.productionDueDate) : "Not set"}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-700">Activity Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Jobs</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{data.jobCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Queued</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {data.sentToProductionAt ? formatDate(data.sentToProductionAt) : "No"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Started</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {data.prodStartedAt ? formatDate(data.prodStartedAt) : "No"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {data.producedAt ? formatDate(data.producedAt) : "No"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-700">Production Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.timeline.map((event) => (
            <div
              key={event.label}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"
            >
              <div className="flex items-center gap-2">
                <CircleCheck className="size-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-800">{event.label}</span>
              </div>
              <span className="text-sm text-slate-500">
                {event.value ? formatDate(event.value) : "Not yet"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-700">Related Job Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!data.jobs.length ? (
            <p className="text-sm text-slate-500">No installation jobs linked to this unit yet.</p>
          ) : (
            data.jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">Job #{job.id}</p>
                  <p className="text-xs text-slate-500">{job.assignee}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-800">{job.status || "No status"}</p>
                  <p className="text-xs text-slate-500">{formatDate(job.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function OpenUnitProductionSheet() {
  const { openUnitProductionId, opened, setParams } = useUnitProductionParams();

  return (
    <Sheet
      open={opened}
      onOpenChange={(open) => {
        if (!open) {
          setParams({
            openUnitProductionId: null,
          });
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Task Production Overview</SheetTitle>
        </SheetHeader>
        {openUnitProductionId ? <OverviewContent id={openUnitProductionId} /> : null}
      </SheetContent>
    </Sheet>
  );
}
