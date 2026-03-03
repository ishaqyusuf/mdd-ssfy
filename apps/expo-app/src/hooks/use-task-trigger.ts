import { _trpc } from "@/components/static-trpc";
import { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

type TriggerInput = RouterInputs["taskTrigger"]["trigger"];
type TriggerOutput = RouterOutputs["taskTrigger"]["trigger"];
type StatusOutput = RouterOutputs["taskTrigger"]["status"];

type UseTaskTriggerProps = {
  taskName?: string;
  autoCheckStatus?: boolean;
  pollIntervalMs?: number;
  onStarted?: (run: TriggerOutput) => void | Promise<void>;
  onCompleted?: (run: StatusOutput) => void | Promise<void>;
  onFailed?: (run: StatusOutput) => void | Promise<void>;
  onCancelled?: (run: StatusOutput) => void | Promise<void>;
  onStatusChange?: (run: StatusOutput) => void | Promise<void>;
};

type StartTaskInput = {
  taskName?: string;
  payload: TriggerInput["payload"];
};

type StartAndWaitInput = StartTaskInput & {
  timeoutMs?: number;
};

function isTerminalStatus(status?: StatusOutput | null) {
  if (!status) return false;
  return status.isCompleted || status.isFailed || status.isCancelled;
}

function getRunErrorMessage(run: StatusOutput) {
  const unknownMessage = "Task failed";
  if (!run.error) return unknownMessage;
  if (typeof run.error === "string") return run.error;
  if (typeof run.error === "object" && run.error) {
    const maybeMessage = (run.error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return unknownMessage;
}

export function useTaskTrigger(props?: UseTaskTriggerProps) {
  const autoCheckStatus = props?.autoCheckStatus ?? true;
  const pollIntervalMs = props?.pollIntervalMs ?? 1500;
  const queryClient = useQueryClient();
  const [runId, setRunId] = useState<string | null>(null);
  const [startedRun, setStartedRun] = useState<TriggerOutput | null>(null);
  const completedRunIds = useRef(new Set<string>());
  const failedRunIds = useRef(new Set<string>());
  const cancelledRunIds = useRef(new Set<string>());

  const trigger = useMutation(_trpc.taskTrigger.trigger.mutationOptions());
  const status = useQuery(
    _trpc.taskTrigger.status.queryOptions(
      { runId: runId ?? "" },
      {
        enabled: autoCheckStatus && !!runId,
        refetchInterval: (query) => {
          const run = query.state.data as StatusOutput | undefined;
          return isTerminalStatus(run) ? false : pollIntervalMs;
        },
      },
    ),
  );

  const start = useCallback(
    async (input: StartTaskInput) => {
      const taskName = input.taskName ?? props?.taskName;
      if (!taskName) {
        throw new Error("taskName is required");
      }

      const nextRun = await trigger.mutateAsync({
        taskName,
        payload: input.payload,
      });

      setRunId(nextRun.id);
      setStartedRun(nextRun);
      completedRunIds.current.delete(nextRun.id);
      failedRunIds.current.delete(nextRun.id);
      cancelledRunIds.current.delete(nextRun.id);
      await props?.onStarted?.(nextRun);

      return nextRun;
    },
    [props, trigger],
  );

  const waitForRun = useCallback(
    async (runIdToWait: string, timeoutMs = 120_000) => {
      const startedAt = Date.now();

      while (true) {
        const run = await queryClient.fetchQuery(
          _trpc.taskTrigger.status.queryOptions(
            { runId: runIdToWait },
            {
              staleTime: 0,
            },
          ),
        );

        if (run.isFailed || run.isCancelled) {
          throw new Error(getRunErrorMessage(run));
        }

        if (run.isCompleted) {
          return run;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          throw new Error("Timed out waiting for task completion");
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
    },
    [pollIntervalMs, queryClient],
  );

  const startAndWait = useCallback(
    async (input: StartAndWaitInput) => {
      const nextRun = await start(input);
      return waitForRun(nextRun.id, input.timeoutMs);
    },
    [start, waitForRun],
  );

  useEffect(() => {
    const run = status.data;
    if (!run) return;
    void props?.onStatusChange?.(run);
  }, [props, status.data]);

  useEffect(() => {
    const currentRunId = runId;
    const run = status.data;
    if (!currentRunId || !run) return;

    if (run.isCompleted && !completedRunIds.current.has(currentRunId)) {
      completedRunIds.current.add(currentRunId);
      void props?.onCompleted?.(run);
    }

    if (run.isFailed && !failedRunIds.current.has(currentRunId)) {
      failedRunIds.current.add(currentRunId);
      void props?.onFailed?.(run);
    }

    if (run.isCancelled && !cancelledRunIds.current.has(currentRunId)) {
      cancelledRunIds.current.add(currentRunId);
      void props?.onCancelled?.(run);
    }
  }, [props, runId, status.data]);

  const currentStatus = status.data;
  const isTerminal = isTerminalStatus(currentStatus);

  const reset = useCallback(() => {
    trigger.reset();
    setRunId(null);
    setStartedRun(null);
    completedRunIds.current.clear();
    failedRunIds.current.clear();
    cancelledRunIds.current.clear();
  }, [trigger]);

  return {
    start,
    startAndWait,
    trigger: start,
    reset,
    runId,
    startedRun,
    status: currentStatus,
    statusError: status.error,
    startError: trigger.error,
    error: trigger.error ?? status.error,
    refetchStatus: status.refetch,
    isStarting: trigger.isPending,
    isStarted: !!runId,
    isCheckingStatus: status.isLoading || status.isFetching,
    isQueued: currentStatus?.isQueued ?? false,
    isExecuting: currentStatus?.isExecuting ?? false,
    isCompleted: currentStatus?.isCompleted ?? false,
    isSuccess: currentStatus?.isSuccess ?? false,
    isFailed: currentStatus?.isFailed ?? false,
    isCancelled: currentStatus?.isCancelled ?? false,
    isTerminal,
  };
}
