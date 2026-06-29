import { toast } from "@gnd/ui/use-toast";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { triggerTask } from "@/actions/trigger-task";
import {
    getTaskMonitorTaskDefaults,
    type TaskMonitorIntent,
    useTaskMonitorStore,
} from "@/store/task-monitor";
import { useAuth } from "./use-auth";
import type { TaskName } from "@jobs/schema";
import { useAfterState } from "@gnd/ui/hooks/use-after-state";
interface Props {
    successToast?: string;
    errorToast?: string;
    executingToast?: string;
    taskTitle?: string;
    taskDescription?: string;
    onError?;
    onSuccess?;
    onStarted?;
    debug?: boolean;
    silent?: boolean;
    monitor?: boolean;
}

type TriggerTaskInput = {
    taskName: TaskName;
    payload?: unknown;
};

type TriggerTaskOptions = {
    intent?: TaskMonitorIntent;
};

type PendingTrigger = {
    input: TriggerTaskInput;
    options?: TriggerTaskOptions;
};

export function useTaskTrigger(props?: Props) {
    const {
        successToast = "Success!",
        errorToast = "Something went wrong please try again.",
        executingToast,
        taskTitle,
        taskDescription,
        onError,
        onSuccess,
        onStarted,
        silent,
        monitor,
    } = props || {};
    const shouldShowSuccessToast = !silent && !monitor;
    const [runId, setRunId] = useState<string | undefined>();
    const [accessToken, setAccessToken] = useState<string | undefined>();
    const [status, setStatus] = useState<
        "FAILED" | "SYNCING" | "COMPLETED" | null
    >(null);
    const { run, error } = useRealtimeRun(runId, {
        enabled: !!runId && !!accessToken,
        accessToken,
    });
    const auth = useAuth();
    const addTask = useTaskMonitorStore((state) => state.addTask);
    const pendingTriggersRef = useRef<PendingTrigger[]>([]);
    useEffect(() => {
        if (status === "FAILED") {
            // setIsImporting(false);
            setRunId(undefined);
            // if (!props.silent)
            //     toast({
            //         duration: 3500,
            //         variant: "error",
            //         title: errorToast,
            //     });
            onError?.();
        }
    }, [onError, status]);
    useEffect(() => {
        if (error || run?.status === "FAILED") {
            setStatus("FAILED");
        }

        if (run?.status === "COMPLETED") {
            setStatus("COMPLETED");
            onSuccess?.();
        }
    }, [error, onSuccess, run]);
    useEffect(() => {
        if (status === "COMPLETED") {
            setRunId(undefined);
            // setIsImporting(false);
            // onclose();

            // queryClient.invalidateQueries({
            //     queryKey: trpc.transactions.get.queryKey(),
            // });
            // queryClient.invalidateQueries({
            //     queryKey: trpc.bankAccounts.get.queryKey(),
            // });
            // queryClient.invalidateQueries({
            //     queryKey: trpc.bankConnections.get.queryKey(),
            // });
            // queryClient.invalidateQueries({
            //     queryKey: trpc.metrics.pathKey(),
            // });

            if (shouldShowSuccessToast) {
                toast({
                    duration: 3500,
                    variant: "success",
                    title: successToast,
                });
            }
        }
    }, [shouldShowSuccessToast, status, successToast]);
    const _action = useAction(triggerTask, {
        onExecute() {
            setStatus("SYNCING");
            // if (executingToast)
            //     if (!props.silent)
            //         toast({
            //             duration: Number.POSITIVE_INFINITY,
            //             variant: "spinner",
            //             title: executingToast,
            //         });
        },
        onSuccess({ data }) {
            const pending = pendingTriggersRef.current.shift();
            // if (props?.debug) console.log({ data });
            if (!data?.id || !data?.publicAccessToken) {
                setRunId(undefined);
                setAccessToken(undefined);
                setStatus("FAILED");
                if (!silent)
                    toast({
                        duration: 3500,
                        variant: "error",
                        description: errorToast,
                        title: "Unable to start task",
                    });
                return;
            }
            setRunId(data.id);
            setAccessToken(data.publicAccessToken);
            if (monitor ?? !silent) {
                const taskDefaults = getTaskMonitorTaskDefaults(
                    pending?.input.taskName,
                    pending?.input.payload,
                );

                addTask({
                    runId: data.id,
                    accessToken: data.publicAccessToken,
                    ownerId: auth.id == null ? null : String(auth.id),
                    title:
                        taskTitle ||
                        executingToast ||
                        taskDefaults.title ||
                        successToast,
                    description:
                        taskDescription ||
                        taskDefaults.description ||
                        executingToast,
                    metadata: taskDefaults.metadata,
                    intent: pending?.options?.intent,
                });
            }
            onStarted?.();
        },
        onError(e) {
            pendingTriggersRef.current.shift();
            setRunId(undefined);
            onError?.();
            if (!silent)
                toast({
                    duration: 3500,
                    variant: "error",
                    description: errorToast,
                    title: e?.error?.serverError,
                });
        },
    });
    const trigger = (input: TriggerTaskInput, options?: TriggerTaskOptions) => {
        pendingTriggersRef.current.push({ input, options });
        return _action.execute(input);
    };
    const ctx = {
        trigger,
        triggerWithAuth(taskName: TaskName, payload: Record<string, unknown>) {
            return trigger({
                taskName,
                payload: {
                    ...payload,
                    author: {
                        id: auth.id,
                        name: auth.name,
                    },
                },
            });
        },
        isActionPending: _action.isPending,
        runId,
        accessToken,
        status,
        isLoading: status === "SYNCING",
    };
    return ctx;
}

export function useAfterTaskTrigger(func: () => void) {
    const [runningId, setRunningId] = useState<null | string>(null);
    const tasks = useTaskMonitorStore((state) => state.tasks);

    useAfterState(tasks, func);
}
