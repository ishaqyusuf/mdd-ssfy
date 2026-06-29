"use client";

import { cancelTaskRunAction } from "@/actions/cancel-task-run";
import { useTaskMonitorTasks } from "@/hooks/use-task-notification-params";
import { useTaskMonitorEffects } from "@/hooks/use-task-monitor-effects";
import { useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import {
    type TaskMonitorStatus,
    type TaskMonitorTask,
    useTaskMonitorStore,
} from "@/store/task-monitor";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { toast } from "@gnd/ui/use-toast";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";

export function TaskNotification() {
    const allTasks = useTaskMonitorTasks();
    const { data: session } = useSession();
    const userId = session?.user?.id ? String(session.user.id) : null;
    const tasks = allTasks.filter(
        (task) => !task.ownerId || task.ownerId === userId,
    );
    const clearCompleted = useTaskMonitorStore((state) => state.clearCompleted);
    const markStaleTasks = useTaskMonitorStore((state) => state.markStaleTasks);
    const [open, setOpen] = useState(false);
    const runningTasks = tasks.filter((task) => task.status === "SYNCING");
    const failedTasks = tasks.filter((task) => task.status === "FAILED");
    const canceledTasks = tasks.filter((task) => task.status === "CANCELED");
    const visibleTasks = tasks.filter((task) => task.status !== "COMPLETED");
    const visibleCount =
        runningTasks.length + failedTasks.length + canceledTasks.length;
    const hasRunning = runningTasks.length > 0;
    const hasFailures = failedTasks.length > 0;

    useEffect(() => {
        if (visibleTasks.length === 0) setOpen(false);
    }, [visibleTasks.length]);

    useEffect(() => {
        clearCompleted();
        markStaleTasks();
    }, [clearCompleted, markStaleTasks]);

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
                                            hasFailures
                                                ? "FAILED"
                                                : hasRunning
                                                  ? "SYNCING"
                                                  : "CANCELED"
                                        }
                                    />
                                    <div>
                                        <div className="text-sm font-semibold">
                                            {formatTaskSummary(
                                                runningTasks.length,
                                                failedTasks.length,
                                                canceledTasks.length,
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Background tasks
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
                                : hasRunning
                                  ? "border-primary text-primary"
                                  : "border-border text-muted-foreground",
                        )}
                        onClick={() => setOpen((current) => !current)}
                        aria-label="Open task monitor"
                    >
                        <span
                            className={cn(
                                "absolute inset-0 rounded-full border-2",
                                hasFailures
                                    ? "border-destructive"
                                    : hasRunning
                                      ? "animate-spin border-primary border-t-transparent"
                                      : "border-muted-foreground/40",
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
    const { runTaskEffect } = useTaskMonitorEffects();
    const { run, error, stop } = useRealtimeRun(task.runId, {
        enabled:
            task.status === "SYNCING" && !!task.runId && !!task.accessToken,
        accessToken: task.accessToken,
    });

    useEffect(() => {
        if (task.status !== "SYNCING") return;

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
            const completeTask = async () => {
                const alreadyHandledSuccess = Boolean(
                    task.handledEffects?.success,
                );
                const completedAt = Date.now();
                const handledEffects = alreadyHandledSuccess
                    ? task.handledEffects
                    : {
                          ...task.handledEffects,
                          success: completedAt,
                      };

                updateTask(task.runId, {
                    status: "COMPLETED",
                    handledEffects,
                    completedAt,
                });

                if (!alreadyHandledSuccess) {
                    try {
                        await runTaskEffect(
                            {
                                ...task,
                                status: "COMPLETED",
                                handledEffects,
                                completedAt,
                            },
                            "success",
                        );
                    } catch (effectError) {
                        console.error("Unable to run task success effect", {
                            effectError,
                            runId: task.runId,
                        });
                    }
                }

                window.setTimeout(() => removeTask(task.runId), 2500);
                stop?.();
            };

            void completeTask();
            return;
        }

        if (run.status === "CANCELED") {
            updateTask(task.runId, {
                status: "CANCELED",
                completedAt: Date.now(),
            });
            stop?.();
            return;
        }

        if (run.status === "FAILED") {
            updateTask(task.runId, {
                status: "FAILED",
                error: error?.message || "Task failed.",
                completedAt: Date.now(),
            });
            stop?.();
        }
    }, [error, removeTask, run?.status, runTaskEffect, stop, task, updateTask]);

    return null;
}

function TaskNotificationRow({ task }: { task: TaskMonitorTask }) {
    const updateTask = useTaskMonitorStore((state) => state.updateTask);
    const removeTask = useTaskMonitorStore((state) => state.removeTask);
    const [copied, setCopied] = useState(false);
    const title = task.title || defaultTitle(task);
    const description =
        task.error || task.description || `Run ${shortRunId(task.runId)}`;
    const cancelTask = useAction(cancelTaskRunAction, {
        onSuccess: () => {
            updateTask(task.runId, {
                status: "CANCELED",
                completedAt: Date.now(),
            });
            toast({
                title: "Task cancelled",
                variant: "success",
            });
        },
        onError: ({ error }) => {
            toast({
                title: "Unable to cancel task",
                description: error.serverError || "Please try again.",
                variant: "destructive",
            });
        },
    });
    const copyRunId = async () => {
        try {
            await navigator.clipboard.writeText(task.runId);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

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
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{shortRunId(task.runId)}</span>
                    {task.metadata?.taskName ? (
                        <span>{String(task.metadata.taskName)}</span>
                    ) : null}
                </div>
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => void copyRunId()}
                aria-label={copied ? "Run id copied" : "Copy run id"}
                title={copied ? "Copied" : "Copy run id"}
            >
                {copied ? (
                    <Icons.CheckCircle2 className="size-3.5" />
                ) : (
                    <Icons.Copy className="size-3.5" />
                )}
            </Button>
            {task.status === "SYNCING" ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={cancelTask.isPending}
                    onClick={() => cancelTask.execute({ runId: task.runId })}
                    aria-label="Cancel running task"
                    title="Cancel task"
                >
                    {cancelTask.isPending ? (
                        <Icons.Loader2 className="size-3.5 animate-spin" />
                    ) : (
                        <Icons.Ban className="size-3.5" />
                    )}
                </Button>
            ) : null}
            {task.status === "FAILED" || task.status === "CANCELED" ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeTask(task.runId)}
                    aria-label="Dismiss task"
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

    if (status === "CANCELED") {
        return (
            <Icons.Ban className={cn(className, "text-muted-foreground")} />
        );
    }

    return (
        <Icons.Loader2 className={cn(className, "animate-spin text-primary")} />
    );
}

function defaultTitle(task: TaskMonitorTask) {
    if (task.status === "FAILED") return "Task failed";
    if (task.status === "COMPLETED") return "Task completed";
    if (task.status === "CANCELED") return "Task cancelled";
    return "Task running";
}

function statusLabel(status: TaskMonitorStatus) {
    if (status === "FAILED") return "Failed";
    if (status === "COMPLETED") return "Done";
    if (status === "CANCELED") return "Cancelled";
    return "Running";
}

function formatTaskSummary(
    runningCount: number,
    failedCount: number,
    canceledCount: number,
) {
    const parts = [];

    if (runningCount) {
        parts.push(
            `${runningCount} task${runningCount === 1 ? "" : "s"} running`,
        );
    }

    if (failedCount) {
        parts.push(`${failedCount} failed`);
    }

    if (canceledCount) {
        parts.push(`${canceledCount} cancelled`);
    }

    return parts.join(", ");
}

function shortRunId(runId: string) {
    return runId.length > 10
        ? `${runId.slice(0, 6)}...${runId.slice(-4)}`
        : runId;
}
