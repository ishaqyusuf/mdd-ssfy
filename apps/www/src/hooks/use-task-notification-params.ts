"use client";

import {
    serializeTaskMonitorTask,
    useTaskMonitorStore,
} from "@/store/task-monitor";

export function useTaskNotificationParams() {
    const tasks = useTaskMonitorTasks();
    const addTask = useTaskMonitorStore((state) => state.addTask);

    return {
        filters: {
            tasks: tasks.map(serializeTaskMonitorTask),
        },
        setFilters() {},
        pushTask(
            runUid: string,
            accessUid: string,
            title?: string,
            description?: string,
        ) {
            addTask({
                runId: runUid,
                accessToken: accessUid,
                title,
                description,
            });
        },
    };
}

export function useTaskMonitorTasks() {
    return useTaskMonitorStore((state) => state.tasks);
}
