"use client";

import { useTaskMonitorStore } from "@/store/task-monitor";

export function useTaskMonitorTasks() {
    return useTaskMonitorStore((state) => state.tasks);
}
