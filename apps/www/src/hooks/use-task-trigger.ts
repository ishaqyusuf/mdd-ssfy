import { toast } from "@gnd/ui/use-toast";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { triggerTask } from "@/actions/trigger-task";
import { useTaskNotificationParams } from "./use-task-notification-params";
import { useAuth } from "./use-auth";
import { TaskName } from "@jobs/schema";

interface Props {
    successToast?: string;
    errorToast?: string;
    executingToast?: string;
    onError?;
    onSucces?;
    debug?: boolean;
    silent?: boolean;
}
export function useTaskTrigger(props?: Props) {
    const {
        successToast = "Success!",
        errorToast = "Something went wrong please try again.",
        executingToast,
    } = props || {};
    const [runId, setRunId] = useState<string | undefined>();
    const [accessToken, setAccessToken] = useState<string | undefined>();
    // const { status, setStatus } = useSyncStatus({ runId, accessToken });
    const [status, setStatus] = useState<
        "FAILED" | "SYNCING" | "COMPLETED" | null
    >(null);
    const { run, error } = useRealtimeRun(runId, {
        enabled: !!runId && !!accessToken,
        accessToken,
    });
    const auth = useAuth();
    const { pushTask } = useTaskNotificationParams();
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
            props?.onError?.();
        }
    }, [status]);
    useEffect(() => {
        if (error || run?.status === "FAILED") {
            setStatus("FAILED");
        }

        if (run?.status === "COMPLETED") {
            setStatus("COMPLETED");
            props?.onSucces?.();
        }
    }, [error, run]);
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

            toast({
                duration: 3500,
                variant: "success",
                title: successToast,
            });
        }
    }, [status]);
    const _action = useAction(triggerTask, {
        onExecute(args) {
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
            // if (props?.debug) console.log({ data });
            // if (data) {
            //     setRunId(data.id);
            //     setAccessToken(data.publicAccessToken);
            // }
            if (!props.silent) pushTask(data.id, data.publicAccessToken);
        },
        onError(e) {
            if (props?.debug) console.log({ e });
            setRunId(undefined);
            console.log(e);
            if (!props.silent)
                toast({
                    duration: 3500,
                    variant: "error",
                    description: errorToast,
                    title: e?.error?.serverError,
                });
        },
    });
    const ctx = {
        trigger: _action.execute,
        triggerWithAuth(taskName: TaskName, payload) {
            return _action.execute({
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
        runId,
        accessToken,
        status,
        isLoading: status == "SYNCING",
    };
    return ctx;
}
