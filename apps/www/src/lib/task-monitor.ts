"use client";

export type TaskMonitorStatus = "SYNCING" | "COMPLETED" | "FAILED";

export type TaskMonitorTask = {
	id: string;
	runId: string;
	accessToken: string;
	title?: string;
	description?: string;
	status: TaskMonitorStatus;
	error?: string;
	createdAt: number;
	updatedAt: number;
	completedAt?: number;
};

const TASK_MONITOR_STORAGE_KEY = "gnd:task-monitor:v1";
const TASK_MONITOR_EVENT = "gnd-task-monitor-updated";

type TaskMonitorListener = () => void;

export function readTaskMonitorTasks() {
	if (typeof window === "undefined") return [];

	try {
		const stored = window.localStorage.getItem(TASK_MONITOR_STORAGE_KEY);
		if (!stored) return [];

		const parsed = JSON.parse(stored);
		if (!Array.isArray(parsed)) return [];

		return parsed.filter(isTaskMonitorTask);
	} catch {
		return [];
	}
}

export function writeTaskMonitorTasks(tasks: TaskMonitorTask[]) {
	if (typeof window === "undefined") return;

	const nextTasks = pruneTasks(tasks);
	window.localStorage.setItem(
		TASK_MONITOR_STORAGE_KEY,
		JSON.stringify(nextTasks),
	);
	window.dispatchEvent(new CustomEvent(TASK_MONITOR_EVENT));
}

export function subscribeToTaskMonitor(listener: TaskMonitorListener) {
	if (typeof window === "undefined") return () => {};

	const handleStorage = (event: StorageEvent) => {
		if (event.key === TASK_MONITOR_STORAGE_KEY) listener();
	};

	window.addEventListener(TASK_MONITOR_EVENT, listener);
	window.addEventListener("storage", handleStorage);

	return () => {
		window.removeEventListener(TASK_MONITOR_EVENT, listener);
		window.removeEventListener("storage", handleStorage);
	};
}

export function addTaskMonitorTask(input: {
	runId: string;
	accessToken: string;
	title?: string;
	description?: string;
}) {
	const now = Date.now();
	const tasks = readTaskMonitorTasks();
	const existing = tasks.find((task) => task.runId === input.runId);
	const nextTask: TaskMonitorTask = {
		id: existing?.id ?? input.runId,
		runId: input.runId,
		accessToken: input.accessToken,
		title: input.title,
		description: input.description,
		status: existing?.status ?? "SYNCING",
		error: existing?.error,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
		completedAt: existing?.completedAt,
	};

	writeTaskMonitorTasks([
		nextTask,
		...tasks.filter((task) => task.runId !== input.runId),
	]);
}

export function updateTaskMonitorTask(
	runId: string,
	patch: Partial<
		Pick<
			TaskMonitorTask,
			"status" | "error" | "title" | "description" | "completedAt"
		>
	>,
) {
	const now = Date.now();
	const tasks = readTaskMonitorTasks();

	writeTaskMonitorTasks(
		tasks.map((task) =>
			task.runId === runId
				? {
						...task,
						...patch,
						updatedAt: now,
					}
				: task,
		),
	);
}

export function removeTaskMonitorTask(runId: string) {
	writeTaskMonitorTasks(
		readTaskMonitorTasks().filter((task) => task.runId !== runId),
	);
}

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

function isTaskMonitorTask(value: unknown): value is TaskMonitorTask {
	if (!value || typeof value !== "object") return false;

	const task = value as Partial<TaskMonitorTask>;
	return (
		typeof task.id === "string" &&
		typeof task.runId === "string" &&
		typeof task.accessToken === "string" &&
		(task.status === "SYNCING" ||
			task.status === "COMPLETED" ||
			task.status === "FAILED") &&
		typeof task.createdAt === "number" &&
		typeof task.updatedAt === "number"
	);
}
