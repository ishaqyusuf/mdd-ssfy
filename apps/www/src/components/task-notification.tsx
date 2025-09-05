import { useTaskNotificationParams } from "@/hooks/use-task-notification-params";
import { useToast } from "@gnd/ui/use-toast";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { filter } from "lodash";
import { useEffect, useState } from "react";

type Toast = Parameters<ReturnType<typeof useToast>["update"]>[1];
export function TaskNotification() {
    const { filters, setFilters } = useTaskNotificationParams();

    return filters?.tasks?.map((f) => <NotificationItem uid={f} key={f} />);
}

function NotificationItem({ uid }) {
    const [runId, accessToken, title, description] = uid?.split("-");

    const { setFilters, filters } = useTaskNotificationParams();

    const [status, setStatus] = useState<
        "FAILED" | "SYNCING" | "COMPLETED" | null
    >(null);
    const { run, error, stop } = useRealtimeRun(runId, {
        enabled: !!runId && !!accessToken,
        accessToken,
    });

    const { toast, dismiss, update } = useToast();
    const [toastId, setToastId] = useState(null);
    useEffect(() => {
        const running = run.status === "EXECUTING";
        const toastData: Partial<Toast> = {
            variant: running ? "spinner" : error ? "destructive" : "success",
            title: title || run.status,
            description: error?.message || description || title,
        };
        if (!toastId) {
            const { id } = toast(toastData);
            setToastId(id);
        } else {
            update(toastId, toastData as any);
        }
        if (
            !running
            // run.status === "FAILED" || error || run?.status === "CANCELED"
        ) {
            setTimeout(() => {
                // dismiss
                dismiss();
                const tasks = filters.tasks.filter((t) => t != uid);
                setFilters({
                    tasks: tasks.length ? tasks : null,
                });
            }, 3000);
            // dismiss(toastId);
            // setToastId(null);
        }
    }, [run, error]);
    // use toast
    // toast()
    return <></>;
}

