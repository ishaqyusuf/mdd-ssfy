import { sendSalesEmail } from "@/actions/sales/send-sales-email";
import { toast } from "@gnd/ui/use-toast";
import { useAction } from "next-safe-action/hooks";
import {
    parseAsArrayOf,
    parseAsBoolean,
    parseAsInteger,
    parseAsString,
    useQueryStates,
} from "nuqs";
import { useEffect, useState } from "react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";

export function useSalesEmailSender() {
    const [params, setParams] = useQueryStates({
        withPayment: parseAsBoolean,
        partPayment: parseAsBoolean,
        sendEmailSalesNos: parseAsArrayOf(parseAsString),
        sendEmailSalesIds: parseAsArrayOf(parseAsInteger),
        reminder: parseAsBoolean,
    });

    return {
        params,
        setParams,
    };
}
export function useSalesMailer() {
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

            toast({
                duration: 3500,
                variant: "error",
                title: "Something went wrong please try again or contact support.",
            });
        }
    }, [status]);
    useEffect(() => {
        if (error || run?.status === "FAILED") {
            setStatus("FAILED");
        }

        if (run?.status === "COMPLETED") {
            setStatus("COMPLETED");
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
                title: "Transactions imported successfully.",
            });
        }
    }, [status]);
    const _action = useAction(sendSalesEmail, {
        onSuccess({ data }) {
            if (data) {
                setRunId(data.id);
                setAccessToken(data.publicAccessToken);
            }
        },
        onError() {
            setRunId(undefined);
            setStatus("FAILED");
            toast({
                duration: 3500,
                variant: "error",
                title: "Something went wrong please try again.",
            });
        },
    });
    const ctx = {
        send: _action.execute,
    };
    return ctx;
}
