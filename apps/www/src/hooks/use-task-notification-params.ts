"use client";

import {
	addTaskMonitorTask,
	readTaskMonitorTasks,
	serializeTaskMonitorTask,
	subscribeToTaskMonitor,
} from "@/lib/task-monitor";
import { useEffect, useState } from "react";

export function useTaskNotificationParams() {
	const tasks = useTaskMonitorTasks();

	return {
		filters: {
			tasks: tasks.map(serializeTaskMonitorTask),
		},
		setFilters() {},
		pushTask(runUid: string, accessUid: string, title?: string, description?: string) {
			if (!runUid || !accessUid) return;

			addTaskMonitorTask({
				runId: runUid,
				accessToken: accessUid,
				title,
				description,
			});
		},
	};
}

export function useTaskMonitorTasks() {
	const [tasks, setTasks] = useState(() => readTaskMonitorTasks());

	useEffect(() => {
		const syncTasks = () => setTasks(readTaskMonitorTasks());
		syncTasks();

		return subscribeToTaskMonitor(syncTasks);
	}, []);

	return tasks;
}
