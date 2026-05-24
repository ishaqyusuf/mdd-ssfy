"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TaskName } from "@jobs/schema";

export type TaskMonitorStatus = "SYNCING" | "COMPLETED" | "FAILED";

export type TaskMonitorMetadata = {
    taskName?: TaskName | string;
    type?: string;
    entityId?: string | number | null;
    entityLabel?: string | null;
};

export type TaskMonitorTask = {
    id: string;
    runId: string;
    accessToken: string;
    ownerId?: string | null;
    title?: string;
    description?: string;
    status: TaskMonitorStatus;
    error?: string;
    metadata?: TaskMonitorMetadata;
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
};

type AddTaskInput = {
    runId: string;
    accessToken: string;
    ownerId?: string | null;
    title?: string;
    description?: string;
    metadata?: TaskMonitorMetadata;
};

type TaskPatch = Partial<
    Pick<
        TaskMonitorTask,
        | "status"
        | "error"
        | "title"
        | "description"
        | "metadata"
        | "completedAt"
    >
>;

type TaskMonitorStore = {
    tasks: TaskMonitorTask[];
    addTask: (input: AddTaskInput) => void;
    updateTask: (runId: string, patch: TaskPatch) => void;
    removeTask: (runId: string) => void;
    clearCompleted: () => void;
    markStaleTasks: () => void;
};

export const useTaskMonitorStore = create<TaskMonitorStore>()(
    persist(
        (set, get) => ({
            tasks: [],
            addTask: (input) => {
                if (!input.runId || !input.accessToken) return;

                const now = Date.now();
                const tasks = pruneTasks(get().tasks);
                const existing = tasks.find(
                    (task) => task.runId === input.runId,
                );
                const nextTask: TaskMonitorTask = {
                    id: existing?.id ?? input.runId,
                    runId: input.runId,
                    accessToken: input.accessToken,
                    ownerId: input.ownerId ?? existing?.ownerId ?? null,
                    title: input.title ?? existing?.title,
                    description: input.description ?? existing?.description,
                    status: existing?.status ?? "SYNCING",
                    error: existing?.error,
                    metadata: input.metadata ?? existing?.metadata,
                    createdAt: existing?.createdAt ?? now,
                    updatedAt: now,
                    completedAt: existing?.completedAt,
                };

                set({
                    tasks: [
                        nextTask,
                        ...tasks.filter((task) => task.runId !== input.runId),
                    ],
                });
            },
            updateTask: (runId, patch) => {
                const now = Date.now();

                set((state) => ({
                    tasks: pruneTasks(
                        state.tasks.map((task) =>
                            task.runId === runId
                                ? {
                                      ...task,
                                      ...patch,
                                      updatedAt: now,
                                  }
                                : task,
                        ),
                    ),
                }));
            },
            markStaleTasks: () => {
                const now = Date.now();

                set((state) => ({
                    tasks: state.tasks.map((task) => {
                        if (task.status !== "SYNCING") return task;
                        if (now - task.updatedAt < STALE_RUNNING_TASK_MS) {
                            return task;
                        }

                        return {
                            ...task,
                            status: "FAILED",
                            error: "This task has not reported progress for a while. Check the job run before retrying.",
                            updatedAt: now,
                            completedAt: now,
                        };
                    }),
                }));
            },
            removeTask: (runId) => {
                set((state) => ({
                    tasks: state.tasks.filter((task) => task.runId !== runId),
                }));
            },
            clearCompleted: () => {
                set((state) => ({
                    tasks: state.tasks.filter(
                        (task) => task.status !== "COMPLETED",
                    ),
                }));
            },
        }),
        {
            name: "gnd-task-monitor",
            partialize: (state) => ({
                tasks: pruneTasks(state.tasks),
            }),
        },
    ),
);

export function serializeTaskMonitorTask(task: TaskMonitorTask) {
    return [task.runId, task.accessToken, task.title, task.description]
        .map((value) => value || "")
        .join(";");
}

export function getTaskMonitorTaskDefaults(
    taskName?: TaskName | string,
    payload?: unknown,
): {
    title: string;
    description?: string;
    metadata: TaskMonitorMetadata;
} {
    const metadata = getTaskMonitorMetadata(taskName, payload);
    const entitySuffix = metadata.entityLabel
        ? ` for ${metadata.entityLabel}`
        : "";
    const title = getTaskNameLabel(taskName);

    return {
        title: `${title}${entitySuffix}`,
        description: getTaskDescription(taskName, metadata),
        metadata,
    };
}

function pruneTasks(tasks: TaskMonitorTask[]) {
    const now = Date.now();

    return tasks
        .filter((task) => {
            if (task.status === "SYNCING") return true;
            return now - getTerminalAt(task) < TERMINAL_TASK_RETENTION_MS;
        })
        .slice(0, 25);
}

function getTerminalAt(task: TaskMonitorTask) {
    return task.completedAt ?? task.updatedAt;
}

function getTaskMonitorMetadata(
    taskName?: TaskName | string,
    payload?: unknown,
): TaskMonitorMetadata {
    const data = payload && typeof payload === "object" ? (payload as any) : {};
    const salesId = data?.meta?.salesId ?? data?.salesId ?? data?.salesOrderId;
    const salesIds = Array.isArray(data?.salesIds)
        ? data.salesIds
        : Array.isArray(data?.ids)
          ? data.ids
          : null;
    const dispatchId =
        data?.dispatchId ??
        data?.packItems?.dispatchId ??
        data?.clearPackings?.dispatchId ??
        data?.submitDispatch?.dispatchId;

    if (taskName === "send-sales-email") {
        return {
            taskName,
            type: "sales-email",
            entityId: salesIds?.[0] ?? salesId ?? null,
            entityLabel: salesIds?.length
                ? `${salesIds.length} sale${salesIds.length === 1 ? "" : "s"}`
                : salesId
                  ? `sale #${salesId}`
                  : null,
        };
    }

    if (taskName === "send-sales-reminder") {
        return {
            taskName,
            type: "sales-reminder",
            entityId: salesIds?.[0] ?? null,
            entityLabel: salesIds?.length
                ? `${salesIds.length} reminder${salesIds.length === 1 ? "" : "s"}`
                : null,
        };
    }

    if (
        taskName === "update-sales-control" ||
        taskName === "reset-sales-control"
    ) {
        return {
            taskName,
            type: "sales-control",
            entityId: salesId ?? dispatchId ?? null,
            entityLabel: salesId
                ? `sale #${salesId}`
                : dispatchId
                  ? `dispatch #${dispatchId}`
                  : null,
        };
    }

    if (taskName === "notification") {
        return {
            taskName,
            type: "notification",
            entityId:
                data?.payload?.dispatchId ?? data?.payload?.salesId ?? null,
            entityLabel: data?.channel
                ? String(data.channel).replaceAll("_", " ")
                : null,
        };
    }

    return {
        taskName,
        type: taskName ? String(taskName) : undefined,
        entityId: salesId ?? dispatchId ?? null,
        entityLabel: salesId
            ? `sale #${salesId}`
            : dispatchId
              ? `dispatch #${dispatchId}`
              : null,
    };
}

function getTaskNameLabel(taskName?: TaskName | string) {
    switch (taskName) {
        case "send-sales-email":
            return "Sending sales email";
        case "send-sales-reminder":
            return "Sending reminder email";
        case "send-composed-email":
            return "Sending email";
        case "notification":
            return "Sending notification";
        case "update-sales-control":
            return "Updating sales control";
        case "reset-sales-control":
            return "Resetting sales control";
        case "create-sales-history":
            return "Recording sales history";
        case "create-sales-dispatch":
            return "Creating dispatch";
        case "warm-sales-document-snapshot":
            return "Preparing sales document";
        case "sync-sales-inventory-line-items":
            return "Syncing sales inventory";
        case "attach-signed-dispatch-pdf":
            return "Attaching signed dispatch PDF";
        case "run-inventory-full-import-now":
        case "run-inventory-full-import-test":
            return "Running inventory import";
        default:
            return taskName
                ? toTitleCase(String(taskName).replaceAll("-", " "))
                : "Running background task";
    }
}

function getTaskDescription(
    taskName: TaskName | string | undefined,
    metadata: TaskMonitorMetadata,
) {
    if (taskName === "send-sales-email") {
        return "We will keep watching this email job until it finishes.";
    }

    if (taskName === "send-sales-reminder") {
        return "We will keep watching this reminder job until it finishes.";
    }

    if (metadata.entityLabel) {
        return `Monitoring ${metadata.entityLabel}.`;
    }

    return "Monitoring this background job until it finishes.";
}

function toTitleCase(value: string) {
    return value.replace(/\w\S*/g, (word) => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
}

const TERMINAL_TASK_RETENTION_MS = 24 * 60 * 60 * 1000;
const STALE_RUNNING_TASK_MS = 6 * 60 * 60 * 1000;
