"use client";

import dynamic from "next/dynamic";

import { useTaskMonitorStore } from "@/store/task-monitor";

const TaskNotification = dynamic(
    () => import("./task-notification").then((mod) => mod.TaskNotification),
    {
        ssr: false,
    },
);

export function TaskNotificationProvider() {
    const taskCount = useTaskMonitorStore((state) => state.tasks.length);

    return taskCount > 0 ? <TaskNotification /> : null;
}
