"use client";

import dynamic from "next/dynamic";

const TaskNotification = dynamic(
	() => import("./task-notification").then((mod) => mod.TaskNotification),
	{
		ssr: false,
	},
);

export function TaskNotificationProvider() {
	return <TaskNotification />;
}
