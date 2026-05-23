"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TaskMonitorStatus = "SYNCING" | "COMPLETED" | "FAILED";

export type TaskMonitorTask = {
    id: string;
    runId: string;
    accessToken: string;
    ownerId?: string | null;
    title?: string;
    description?: string;
    status: TaskMonitorStatus;
    error?: string;
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
};

type TaskPatch = Partial<
    Pick<
        TaskMonitorTask,
        "status" | "error" | "title" | "description" | "completedAt"
    >
>;

type TaskMonitorStore = {
    tasks: TaskMonitorTask[];
    addTask: (input: AddTaskInput) => void;
    updateTask: (runId: string, patch: TaskPatch) => void;
    removeTask: (runId: string) => void;
    clearCompleted: () => void;
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
                    title: input.title,
                    description: input.description,
                    status: existing?.status ?? "SYNCING",
                    error: existing?.error,
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

function pruneTasks(tasks: TaskMonitorTask[]) {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return tasks
        .filter((task) => {
            if (task.status === "SYNCING") return true;
            const terminalAt = task.completedAt ?? task.updatedAt;
            return now - terminalAt < oneDay;
        })
        .slice(0, 25);
}
