import { toast } from "@gnd/ui/use-toast";
import { useEffect, useState } from "react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useMutation } from "@tanstack/react-query";
import { TaskName } from "../../../jobs/src/schema";

interface Props {
  successToast?: string;
  errorToast?: string;
  executingToast?: string;
  onError?: any;
  onSucces?: any;
  debug?: boolean;
  silent?: boolean;
  triggerMutation?: any;
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
  useEffect(() => {
    if (status === "FAILED") {
      // setIsImporting(false);
      setRunId(undefined);
      if (!props?.silent)
        toast({
          duration: 3500,
          variant: "error",
          title: errorToast,
        });
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
  const { mutate, mutateAsync, isPending } = useMutation(
    props?.triggerMutation.mutationOptions({
      onMutate(variables: any) {
        if (executingToast)
          if (!props?.silent)
            toast({
              duration: Number.POSITIVE_INFINITY,
              variant: "spinner",
              title: executingToast,
            });
      },
      onSuccess(data: any) {
        if (props?.debug) console.log({ data });
        if (data) {
          setRunId(data.id);
          setAccessToken(data.publicAccessToken);
        }
      },
    })
  );

  const ctx = {
    trigger: (taskName: TaskName, payload: any) =>
      (mutate as any)({
        taskName,
        payload,
      }),
    triggerAsync: async (taskName: TaskName, payload: any) =>
      await (mutateAsync as any)({
        taskName,
        payload,
      }),
    runId,
    accessToken,
    status,
    isLoading: status == "SYNCING",
  };
  return ctx;
}
