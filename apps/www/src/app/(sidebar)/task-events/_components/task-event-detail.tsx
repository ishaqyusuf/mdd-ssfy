"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { _trpc } from "@/components/static-trpc";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Button } from "@gnd/ui/button";
import { Badge } from "@gnd/ui/badge";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";

type Props = {
  eventName: string;
};

export function TaskEventDetail({ eventName }: Props) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [filterText, setFilterText] = useState("{}");
  const [runId, setRunId] = useState<string | null>(null);

  const { data, isPending, refetch } = useQuery(
    _trpc.taskEvents.get.queryOptions({ eventName }),
  );

  const historyQuery = useQuery(
    _trpc.taskEvents.history.queryOptions({ eventName }),
  );

  const runStatusQuery = useQuery(
    _trpc.taskEvents.runStatus.queryOptions(
      {
        runId: runId || "pending",
      },
      {
        enabled: !!runId,
        refetchInterval: (query) => {
          const status = query.state.data?.status;
          if (!status) return 1000;
          return status === "COMPLETED" || status === "FAILED" ? false : 1000;
        },
      },
    ),
  );

  useEffect(() => {
    if (!data?.config) return;
    setStatus(data.config.status);
    setFilterText(JSON.stringify(data.config.filter || {}, null, 2));
  }, [data?.config]);

  const saveMutation = useMutation(
    _trpc.taskEvents.update.mutationOptions({
      onSuccess: async () => {
        toast({
          variant: "success",
          title: "Task event updated",
        });
        await Promise.all([
          refetch(),
          historyQuery.refetch(),
          queryClient.invalidateQueries({
            queryKey: _trpc.taskEvents.list.queryKey(),
          }),
        ]);
      },
    }),
  );

  const runNowMutation = useMutation(
    _trpc.taskEvents.runNow.mutationOptions({
      onSuccess: async (result) => {
        setRunId(result.id);
        toast({
          variant: "success",
          title: "Run started",
          description: `Run ID: ${result.id}`,
        });
        await historyQuery.refetch();
      },
    }),
  );

  const runTestMutation = useMutation(
    _trpc.taskEvents.runTest.mutationOptions({
      onSuccess: async (result) => {
        setRunId(result.id);
        toast({
          variant: "success",
          title: "Test run started",
          description: `Run ID: ${result.id}`,
        });
        await historyQuery.refetch();
      },
    }),
  );

  const runStatus = runStatusQuery.data?.status;
  const latestHistory = historyQuery.data?.list || [];

  const parsedFilter = useMemo(() => {
    try {
      return JSON.parse(filterText || "{}");
    } catch {
      return null;
    }
  }, [filterText]);

  if (isPending) {
    return <div className="text-sm text-muted-foreground">Loading event...</div>;
  }

  if (!data) {
    return <div className="text-sm text-muted-foreground">Event not found.</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{data.title}</h2>
          <p className="text-sm text-muted-foreground">{data.description}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={status === "active" ? "default" : "secondary"}>
            {status}
          </Badge>
          <Link href="/task-events">
            <Button variant="outline" size="sm">
              Back
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
        <div>
          <div className="text-sm font-medium">Status</div>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant={status === "active" ? "default" : "outline"}
              onClick={() => setStatus("active")}
            >
              Active
            </Button>
            <Button
              size="sm"
              variant={status === "inactive" ? "default" : "outline"}
              onClick={() => setStatus("inactive")}
            >
              Inactive
            </Button>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium">Filter (JSON)</div>
          <Textarea
            className="mt-2 min-h-[180px] font-mono text-xs"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          {parsedFilter === null ? (
            <p className="text-xs text-destructive mt-2">Invalid JSON filter.</p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (parsedFilter === null) {
                toast({
                  variant: "error",
                  title: "Fix filter JSON",
                });
                return;
              }

              saveMutation.mutate({
                eventName,
                status,
                filter: parsedFilter,
              });
            }}
            disabled={saveMutation.isPending || parsedFilter === null}
          >
            {saveMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>

          <Button
            variant="outline"
            onClick={() => runTestMutation.mutate({ eventName })}
            disabled={runTestMutation.isPending}
          >
            {runTestMutation.isPending ? "Starting..." : "Run Test"}
          </Button>

          <Button
            variant="outline"
            onClick={() => runNowMutation.mutate({ eventName })}
            disabled={runNowMutation.isPending}
          >
            {runNowMutation.isPending ? "Starting..." : "Run Now"}
          </Button>
        </div>

        {runId ? (
          <div className="text-xs text-muted-foreground">
            Latest run: {runId}
            {runStatus ? ` (${runStatus})` : ""}
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Run History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Value</th>
                <th className="py-2 pr-3">Trigger</th>
                <th className="py-2">Meta</th>
              </tr>
            </thead>
            <tbody>
              {latestHistory.map((item) => {
                const meta = (item.meta || {}) as Record<string, unknown>;
                return (
                  <tr key={item.id} className="border-b align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-2 pr-3">{item.value}</td>
                    <td className="py-2 pr-3">
                      {String(meta.triggerType || "-")}
                    </td>
                    <td className="py-2">
                      <pre className="text-xs whitespace-pre-wrap break-words">
                        {JSON.stringify(meta, null, 2)}
                      </pre>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!latestHistory.length ? (
          <p className="text-sm text-muted-foreground mt-2">No history yet.</p>
        ) : null}
      </div>
    </div>
  );
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}
