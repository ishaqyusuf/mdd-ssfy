"use client";

import { cancelTaskRunAction } from "@/actions/cancel-task-run";
import { finalizeTaskRunDiagnosticAction } from "@/actions/task-run-diagnostics";
import { useTaskMonitorEffects } from "@/hooks/use-task-monitor-effects";
import { useTaskMonitorTasks } from "@/hooks/use-task-notification-params";
import { useSession } from "@/lib/auth/client";
import {
	SALES_EMAIL_LEDGER_PATH,
	getRunErrorMessage,
	getRunTaskOutputFailureMessage,
	getRunTerminalState,
	getTaskFailureMessage,
	getTaskFailureTitle,
	getTaskFailureToastMessage,
	isSalesEmailTaskMetadata,
} from "@/lib/task-feedback";
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
import { useCallback, useEffect, useRef, useState } from "react";

const IS_PRODUCTION_TASK_FEEDBACK = process.env.NODE_ENV === "production";

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
	const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
	const runningTasks = tasks.filter((task) => task.status === "SYNCING");
	const failedTasks = tasks.filter((task) => task.status === "FAILED");
	const canceledTasks = tasks.filter((task) => task.status === "CANCELED");
	const visibleTasks = IS_PRODUCTION_TASK_FEEDBACK
		? runningTasks
		: tasks.filter((task) => task.status !== "COMPLETED");
	const visibleCount = IS_PRODUCTION_TASK_FEEDBACK
		? runningTasks.length
		: runningTasks.length + failedTasks.length + canceledTasks.length;
	const hasRunning = runningTasks.length > 0;
	const hasFailures = failedTasks.length > 0;
	const firstFailedRunId = failedTasks[0]?.runId;

	useEffect(() => {
		if (visibleTasks.length === 0) {
			setOpen(false);
			setExpandedRunId(null);
		}
	}, [visibleTasks.length]);

	const revealTask = useCallback((runId: string) => {
		setOpen(true);
		setExpandedRunId(runId);
	}, []);

	useEffect(() => {
		if (IS_PRODUCTION_TASK_FEEDBACK) return;
		if (!firstFailedRunId) return;
		setOpen(true);
		setExpandedRunId((current) => current ?? firstFailedRunId);
	}, [firstFailedRunId]);

	useEffect(() => {
		clearCompleted();
		markStaleTasks();
	}, [clearCompleted, markStaleTasks]);

	if (!tasks.length) return null;

	return (
		<>
			{tasks.map((task) => (
				<TaskNotificationWatcher
					key={task.runId}
					task={task}
					onTaskFailed={revealTask}
				/>
			))}

			{visibleCount > 0 ? (
				<div className="fixed bottom-4 right-4 z-[90] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
					{open && !IS_PRODUCTION_TASK_FEEDBACK ? (
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
										expanded={expandedRunId === task.runId}
										onToggleExpanded={() =>
											setExpandedRunId((current) =>
												current === task.runId ? null : task.runId,
											)
										}
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
						onClick={() => {
							if (!IS_PRODUCTION_TASK_FEEDBACK) {
								setOpen((current) => !current);
							}
						}}
						aria-label={
							IS_PRODUCTION_TASK_FEEDBACK
								? "Background task running"
								: "Open task monitor"
						}
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
						{IS_PRODUCTION_TASK_FEEDBACK ? (
							<Icons.Loader2 className="relative size-5 animate-spin" />
						) : (
							<span className="relative text-base font-bold">
								{visibleCount}
							</span>
						)}
					</button>
				</div>
			) : null}
		</>
	);
}

function TaskNotificationWatcher({
	task,
	onTaskFailed,
}: {
	task: TaskMonitorTask;
	onTaskFailed: (runId: string) => void;
}) {
	const updateTask = useTaskMonitorStore((state) => state.updateTask);
	const removeTask = useTaskMonitorStore((state) => state.removeTask);
	const { runTaskEffect } = useTaskMonitorEffects();
	const finalizeDiagnostic = useAction(finalizeTaskRunDiagnosticAction);
	const finalizedRef = useRef(new Set<string>());
	const { run, error, stop } = useRealtimeRun(task.runId, {
		enabled: task.status === "SYNCING" && !!task.runId && !!task.accessToken,
		accessToken: task.accessToken,
	});

	const finalizeRun = useCallback(
		(
			observedStatus: "COMPLETED" | "FAILED" | "CANCELED",
			errorMessage?: string,
		) => {
			const key = `${task.runId}:${observedStatus}`;
			if (finalizedRef.current.has(key)) return;
			finalizedRef.current.add(key);

			finalizeDiagnostic.execute({
				runId: task.runId,
				observedStatus,
				errorMessage,
				metadata: task.metadata,
				finishedAt: new Date(),
			});
		},
		[finalizeDiagnostic, task.metadata, task.runId],
	);

	useEffect(() => {
		if (task.status !== "SYNCING") return;

		const failTask = (message: string) => {
			const completedAt = Date.now();
			const currentTask =
				useTaskMonitorStore
					.getState()
					.tasks.find((storedTask) => storedTask.runId === task.runId) ?? task;
			const alreadyHandledError = Boolean(currentTask.handledEffects?.error);
			const handledEffects = alreadyHandledError
				? currentTask.handledEffects
				: {
						...currentTask.handledEffects,
						error: completedAt,
					};

			updateTask(task.runId, {
				status: "FAILED",
				error: message,
				handledEffects,
				completedAt,
			});
			finalizeRun("FAILED", message);

			if (!alreadyHandledError) {
				toast({
					duration: 3500,
					variant: "destructive",
					title: getTaskFailureTitle({
						metadata: task.metadata,
					}),
					description: getTaskFailureToastMessage({
						metadata: task.metadata,
						errorMessage: message,
					}),
				});
			}

			if (IS_PRODUCTION_TASK_FEEDBACK) {
				window.setTimeout(() => removeTask(task.runId), 2500);
			} else {
				onTaskFailed(task.runId);
			}

			stop?.();
		};

		if (error) {
			failTask(
				getTaskFailureMessage({
					metadata: task.metadata,
					errorMessage: error.message || "Unable to monitor this task.",
				}),
			);
			return;
		}

		const terminalState = getRunTerminalState(run);
		if (!terminalState) return;

		if (terminalState === "COMPLETED") {
			const taskOutputFailure = getRunTaskOutputFailureMessage({
				metadata: task.metadata,
				run,
			});
			if (taskOutputFailure) {
				failTask(taskOutputFailure);
				return;
			}

			const completeTask = async () => {
				const alreadyHandledSuccess = Boolean(task.handledEffects?.success);
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
				finalizeRun("COMPLETED");

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

					if (IS_PRODUCTION_TASK_FEEDBACK) {
						toast({
							duration: 3500,
							variant: "success",
							title: "Task completed",
							description: task.title
								? `${task.title} completed successfully.`
								: undefined,
						});
					}
				}

				window.setTimeout(() => removeTask(task.runId), 2500);
				stop?.();
			};

			void completeTask();
			return;
		}

		if (terminalState === "CANCELED") {
			finalizeRun("CANCELED");
			updateTask(task.runId, {
				status: "CANCELED",
				completedAt: Date.now(),
			});
			stop?.();
			return;
		}

		if (terminalState === "FAILED") {
			failTask(
				getTaskFailureMessage({
					metadata: task.metadata,
					errorMessage: getRunErrorMessage(run) || error?.message || null,
				}),
			);
		}
	}, [
		error,
		finalizeRun,
		onTaskFailed,
		removeTask,
		run,
		runTaskEffect,
		stop,
		task,
		updateTask,
	]);

	return null;
}

function TaskNotificationRow({
	task,
	expanded,
	onToggleExpanded,
}: {
	task: TaskMonitorTask;
	expanded: boolean;
	onToggleExpanded: () => void;
}) {
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
		<div className="rounded-md px-2 py-2 hover:bg-muted/60">
			<div className="flex items-start gap-2">
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					onClick={onToggleExpanded}
					aria-label={
						expanded ? "Collapse task details" : "Expand task details"
					}
					title={expanded ? "Collapse" : "Expand"}
					className="mt-0.5 shrink-0"
				>
					{expanded ? (
						<Icons.Clock className="size-3.5" />
					) : (
						<Icons.ChevronRight className="size-3.5" />
					)}
				</Button>
				<TaskStatusIcon status={task.status} />
				<button
					type="button"
					className="min-w-0 flex-1 text-left"
					onClick={onToggleExpanded}
				>
					<div className="flex items-center gap-2">
						<div className="truncate text-sm font-medium">{title}</div>
						<Badge
							variant={task.status === "FAILED" ? "destructive" : "secondary"}
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
				</button>
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
				{task.status === "FAILED" && isSalesEmailTaskMetadata(task.metadata) ? (
					<Button variant="ghost" size="xs" asChild>
						<a href={SALES_EMAIL_LEDGER_PATH}>Emails</a>
					</Button>
				) : null}
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
			{expanded ? (
				<div className="mt-2 rounded-md border bg-muted/30 p-2 text-xs">
					{task.error ? (
						<div className="mb-2 rounded-sm border border-destructive/20 bg-destructive/10 p-2 text-destructive">
							<div className="mb-1 font-medium">Error details</div>
							<div className="whitespace-pre-wrap break-words">
								{task.error}
							</div>
						</div>
					) : null}
					<div className="grid gap-1.5 text-muted-foreground">
						<TaskDetail label="Status" value={statusLabel(task.status)} />
						<TaskDetail label="Run" value={task.runId} />
						<TaskDetail
							label="Task"
							value={
								task.metadata?.taskName || task.title || defaultTitle(task)
							}
						/>
						<TaskDetail label="Type" value={task.metadata?.type} />
						<TaskDetail label="Entity" value={task.metadata?.entityLabel} />
						<TaskDetail label="Description" value={task.description} />
						<TaskDetail
							label="Started"
							value={formatTaskTime(task.createdAt)}
						/>
						<TaskDetail
							label="Updated"
							value={formatTaskTime(task.updatedAt)}
						/>
						<TaskDetail
							label="Finished"
							value={formatTaskTime(task.completedAt)}
						/>
					</div>
				</div>
			) : null}
		</div>
	);
}

function TaskDetail({
	label,
	value,
}: {
	label: string;
	value?: string | number | null;
}) {
	if (value == null || value === "") return null;

	return (
		<div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
			<span className="text-muted-foreground/70">{label}</span>
			<span className="break-words text-foreground">{String(value)}</span>
		</div>
	);
}

function TaskStatusIcon({ status }: { status: TaskMonitorStatus }) {
	const className = "mt-0.5 size-4 shrink-0";

	if (status === "FAILED") {
		return <Icons.AlertCircle className={cn(className, "text-destructive")} />;
	}

	if (status === "COMPLETED") {
		return <Icons.CheckCircle2 className={cn(className, "text-emerald-600")} />;
	}

	if (status === "CANCELED") {
		return <Icons.Ban className={cn(className, "text-muted-foreground")} />;
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
		parts.push(`${runningCount} task${runningCount === 1 ? "" : "s"} running`);
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

function formatTaskTime(value?: number) {
	if (!value) return null;
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}
