"use client";

import { useTaskMonitorTasks } from "@/hooks/use-task-notification-params";
import {
    type TaskMonitorStatus,
    type TaskMonitorTask,
    useTaskMonitorStore,
} from "@/store/task-monitor";
import { cn } from "@/lib/utils";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function TaskNotification() {
    const allTasks = useTaskMonitorTasks();
    const { data: session } = useSession();
    const userId = session?.user?.id ? String(session.user.id) : null;
    const tasks = allTasks.filter(
        (task) => !task.ownerId || task.ownerId === userId,
    );
    const clearCompleted = useTaskMonitorStore((state) => state.clearCompleted);
    const [open, setOpen] = useState(false);
    const runningTasks = tasks.filter((task) => task.status === "SYNCING");
    const failedTasks = tasks.filter((task) => task.status === "FAILED");
    const visibleTasks = tasks.filter((task) => task.status !== "COMPLETED");
    const visibleCount = runningTasks.length + failedTasks.length;
    const hasFailures = failedTasks.length > 0;

    useEffect(() => {
        if (visibleTasks.length === 0) setOpen(false);
    }, [visibleTasks.length]);

    useEffect(() => {
        clearCompleted();
    }, [clearCompleted]);

    if (!tasks.length) return null;

    return (
        <>
            {tasks.map((task) => (
                <TaskNotificationWatcher key={task.runId} task={task} />
            ))}

            {visibleCount > 0 ? (
                <div className="fixed bottom-4 right-4 z-[90] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
                    {open ? (
                        <div className="w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-background shadow-2xl">
                            <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <TaskStatusIcon
                                        status={
                                            hasFailures ? "FAILED" : "SYNCING"
                                        }
                                    />
                                    <div>
                                        <div className="text-sm font-semibold">
                                            {formatTaskSummary(
                                                runningTasks.length,
                                                failedTasks.length,
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Background job monitor
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => setOpen(false)}
                                    aria-label="Collapse task monitor"
                                >
                                    <Icons.X className="size-3.5" />
                                </Button>
                            </div>
                            <div className="max-h-80 overflow-y-auto p-2">
                                {visibleTasks.map((task) => (
                                    <TaskNotificationRow
                                        key={task.runId}
                                        task={task}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <button
                        type="button"
                        className={cn(
                            "group relative flex size-14 items-center justify-center rounded-full border bg-background text-foreground shadow-2xl transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            hasFailures
                                ? "border-destructive text-destructive"
                                : "border-primary text-primary",
                        )}
                        onClick={() => setOpen((current) => !current)}
                        aria-label="Open task monitor"
                    >
                        <span
                            className={cn(
                                "absolute inset-0 rounded-full border-2",
                                hasFailures
                                    ? "border-destructive"
                                    : "animate-spin border-primary border-t-transparent",
                            )}
                        />
                        <span className="relative text-base font-bold">
                            {visibleCount}
                        </span>
                    </button>
                </div>
            ) : null}
        </>
    );
}

function TaskNotificationWatcher({ task }: { task: TaskMonitorTask }) {
    const updateTask = useTaskMonitorStore((state) => state.updateTask);
    const removeTask = useTaskMonitorStore((state) => state.removeTask);
    const { run, error, stop } = useRealtimeRun(task.runId, {
        enabled:
            task.status === "SYNCING" && !!task.runId && !!task.accessToken,
        accessToken: task.accessToken,
    });

    useEffect(() => {
        if (error) {
            updateTask(task.runId, {
                status: "FAILED",
                error: error.message || "Unable to monitor this task.",
                completedAt: Date.now(),
            });
            stop?.();
            return;
        }

        if (!run?.status) return;

        if (run.status === "COMPLETED") {
            updateTask(task.runId, {
                status: "COMPLETED",
                completedAt: Date.now(),
            });
            window.setTimeout(() => removeTask(task.runId), 2500);
            stop?.();
            return;
        }

        if (run.status === "FAILED" || run.status === "CANCELED") {
            updateTask(task.runId, {
                status: "FAILED",
                error: error?.message || `Task ${run.status.toLowerCase()}.`,
                completedAt: Date.now(),
            });
            stop?.();
        }
    }, [error, removeTask, run?.status, stop, task.runId, updateTask]);

    return null;
}

function TaskNotificationRow({ task }: { task: TaskMonitorTask }) {
    const removeTask = useTaskMonitorStore((state) => state.removeTask);
    const title = task.title || defaultTitle(task);
    const description =
        task.error || task.description || `Run ${shortRunId(task.runId)}`;

    return (
        <div className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/60">
            <TaskStatusIcon status={task.status} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-medium">{title}</div>
                    <Badge
                        variant={
                            task.status === "FAILED"
                                ? "destructive"
                                : "secondary"
                        }
                        className="shrink-0"
                    >
                        {statusLabel(task.status)}
                    </Badge>
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {description}
                </div>
            </div>
            {task.status === "FAILED" ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeTask(task.runId)}
                    aria-label="Dismiss failed task"
                >
                    <Icons.X className="size-3.5" />
                </Button>
            ) : null}
        </div>
    );
}

function TaskStatusIcon({ status }: { status: TaskMonitorStatus }) {
    const className = "mt-0.5 size-4 shrink-0";

    if (status === "FAILED") {
        return (
            <Icons.AlertCircle className={cn(className, "text-destructive")} />
        );
    }

    if (status === "COMPLETED") {
        return (
            <Icons.CheckCircle2 className={cn(className, "text-emerald-600")} />
        );
    }

    return (
        <Icons.Loader2 className={cn(className, "animate-spin text-primary")} />
    );
}

function defaultTitle(task: TaskMonitorTask) {
    if (task.status === "FAILED") return "Task failed";
    if (task.status === "COMPLETED") return "Task completed";
    return "Task running";
}

function statusLabel(status: TaskMonitorStatus) {
    if (status === "FAILED") return "Failed";
    if (status === "COMPLETED") return "Done";
    return "Running";
}

function formatTaskSummary(runningCount: number, failedCount: number) {
    const parts = [];

    if (runningCount) {
        parts.push(
            `${runningCount} task${runningCount === 1 ? "" : "s"} running`,
        );
    }

    if (failedCount) {
        parts.push(`${failedCount} failed`);
    }

    return parts.join(", ");
}

function shortRunId(runId: string) {
    return runId.length > 10
        ? `${runId.slice(0, 6)}...${runId.slice(-4)}`
        : runId;
}
