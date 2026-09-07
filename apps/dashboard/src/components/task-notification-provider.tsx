"use client";

import dynamic from "next/dynamic";

import { useTaskMonitorStore } from "@/store/task-monitor";

const TaskNotification = dynamic(
	() => import("./task-notification").then((mod) => mod.TaskNotification),
	{
		ssr: false,
	},
);

const SalesCompletionFallbackProvider = dynamic(
	() =>
		import("./sales-completion-fallback-provider").then(
			(mod) => mod.SalesCompletionFallbackProvider,
		),
	{ ssr: false },
);

export function TaskNotificationProvider() {
	const taskCount = useTaskMonitorStore((state) => state.tasks.length);
	const fallbackCount = useTaskMonitorStore(
		(state) => state.pendingSalesCompletionFallbacks.length,
	);

	if (taskCount === 0 && fallbackCount === 0) return null;
	return (
		<>
			{taskCount > 0 ? <TaskNotification /> : null}
			{fallbackCount > 0 ? <SalesCompletionFallbackProvider /> : null}
		</>
	);
}
