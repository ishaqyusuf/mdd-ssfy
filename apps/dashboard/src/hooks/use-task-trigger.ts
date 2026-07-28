import { triggerTask } from "@/actions/trigger-task";
import {
	getRunErrorMessage,
	getRunTaskOutputFailureMessage,
	getRunTerminalState,
	getTaskFailureMessage,
	getTaskFailureTitle,
	getTaskFailureToastMessage,
	getTaskStartFailureTitle,
} from "@/lib/task-feedback";
import {
	type TaskMonitorIntent,
	getTaskMonitorTaskDefaults,
	useTaskMonitorStore,
} from "@/store/task-monitor";
import { useAfterState } from "@gnd/ui/hooks/use-after-state";
import { toast } from "@gnd/ui/use-toast";
import type { TaskName } from "@jobs/schema";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./use-auth";
interface Props {
	successToast?: string;
	errorToast?: string;
	executingToast?: string;
	taskTitle?: string;
	taskDescription?: string;
	onError?: (message?: string) => void;
	onSuccess?: () => void;
	onStarted?: () => void;
	debug?: boolean;
	silent?: boolean;
	monitor?: boolean;
}

type TriggerTaskInput = {
	taskName: TaskName;
	payload?: unknown;
};

type TriggerTaskOptions = {
	intent?: TaskMonitorIntent;
};

type PendingTrigger = {
	input: TriggerTaskInput;
	options?: TriggerTaskOptions;
};

export function useTaskTrigger(props?: Props) {
	const {
		successToast = "Success!",
		errorToast = "Something went wrong please try again.",
		executingToast,
		taskTitle,
		taskDescription,
		onError,
		onSuccess,
		onStarted,
		silent,
		monitor,
	} = props || {};
	const shouldShowSuccessToast = !silent && !monitor;
	const shouldMonitorTask = monitor ?? !silent;
	const [runId, setRunId] = useState<string | undefined>();
	const [accessToken, setAccessToken] = useState<string | undefined>();
	const [status, setStatus] = useState<
		"FAILED" | "SYNCING" | "COMPLETED" | null
	>(null);
	const [completionError, setCompletionError] = useState<string | null>(null);
	const { run, error } = useRealtimeRun(runId, {
		enabled: !!runId && !!accessToken,
		accessToken,
	});
	const auth = useAuth();
	const addTask = useTaskMonitorStore((state) => state.addTask);
	const updateTask = useTaskMonitorStore((state) => state.updateTask);
	const pendingTriggersRef = useRef<PendingTrigger[]>([]);
	const activeTriggerRef = useRef<PendingTrigger | null>(null);
	const handledFailureRef = useRef(false);
	const executingToastRef = useRef<ReturnType<typeof toast> | null>(null);
	useEffect(() => {
		return () => {
			executingToastRef.current?.dismiss();
			executingToastRef.current = null;
		};
	}, []);
	useEffect(() => {
		if (status === "FAILED") {
			if (handledFailureRef.current) return;
			handledFailureRef.current = true;

			const failedRunId = runId;
			const message = getTaskFailureMessage({
				input: activeTriggerRef.current?.input,
				errorMessage: completionError,
			});

			const existingTask = failedRunId
				? useTaskMonitorStore
						.getState()
						.tasks.find((task) => task.runId === failedRunId)
				: null;
			const alreadyHandledError = Boolean(existingTask?.handledEffects?.error);
			const handledAt = Date.now();

			if (failedRunId && shouldMonitorTask) {
				updateTask(failedRunId, {
					status: "FAILED",
					error: message,
					completedAt: handledAt,
					handledEffects: alreadyHandledError
						? existingTask?.handledEffects
						: {
								...existingTask?.handledEffects,
								error: handledAt,
							},
				});
			}

			setRunId(undefined);
			setAccessToken(undefined);
			executingToastRef.current?.dismiss();
			executingToastRef.current = null;
			if (!silent && !alreadyHandledError) {
				toast({
					duration: 3500,
					variant: "destructive",
					title: failedRunId
						? getTaskFailureTitle({
								input: activeTriggerRef.current?.input,
							})
						: getTaskStartFailureTitle({
								input: activeTriggerRef.current?.input,
							}),
					description:
						getTaskFailureToastMessage({
							input: activeTriggerRef.current?.input,
							errorMessage: message,
						}) || errorToast,
				});
			}
			activeTriggerRef.current = null;
			onError?.(message);
		}
	}, [
		completionError,
		errorToast,
		onError,
		runId,
		shouldMonitorTask,
		silent,
		status,
		updateTask,
	]);
	useEffect(() => {
		if (error) {
			setCompletionError(
				getTaskFailureMessage({
					input: activeTriggerRef.current?.input,
					errorMessage: error.message || null,
				}),
			);
			setStatus("FAILED");
			return;
		}

		const terminalState = getRunTerminalState(run);

		if (terminalState === "FAILED") {
			setCompletionError(
				getTaskFailureMessage({
					input: activeTriggerRef.current?.input,
					errorMessage: getRunErrorMessage(run),
				}),
			);
			setStatus("FAILED");
			return;
		}

		if (terminalState === "COMPLETED") {
			const outputFailure = getRunTaskOutputFailureMessage({
				input: activeTriggerRef.current?.input,
				run,
			});
			if (outputFailure) {
				setCompletionError(outputFailure);
				setStatus("FAILED");
				return;
			}

			setCompletionError(null);
			setStatus("COMPLETED");
			activeTriggerRef.current = null;
			onSuccess?.();
		}
	}, [error, onSuccess, run]);
	useEffect(() => {
		if (status === "COMPLETED") {
			setRunId(undefined);
			setAccessToken(undefined);
			executingToastRef.current?.dismiss();
			executingToastRef.current = null;
			// setIsImporting(false);
			// onclose();

			// queryClient.invalidateQueries({
			//     queryKey: trpc.transactions.get.queryKey(),
			// });
			// queryClient.invalidateQueries({
			//     queryKey: trpc.bankAccounts.get.queryKey(),
			// });
			// queryClient.invalidateQueries({
			//     queryKey: trpc.bankConnections.get.queryKey(),
			// });
			// queryClient.invalidateQueries({
			//     queryKey: trpc.metrics.pathKey(),
			// });

			if (shouldShowSuccessToast) {
				toast({
					duration: 3500,
					variant: "success",
					title: successToast,
				});
			}
		}
	}, [shouldShowSuccessToast, status, successToast]);
	const _action = useAction(triggerTask, {
		onExecute() {
			setStatus("SYNCING");
			setCompletionError(null);
			handledFailureRef.current = false;
			if (executingToast && !silent) {
				executingToastRef.current?.dismiss();
				executingToastRef.current = toast({
					duration: 2500,
					variant: "spinner",
					title: executingToast,
				});
			}
		},
		onSuccess({ data }) {
			const pending = pendingTriggersRef.current.shift();
			// if (props?.debug) console.log({ data });
			if (!data?.id || !data?.publicAccessToken) {
				const errorMessage = (data as { errorMessage?: string } | undefined)
					?.errorMessage;
				activeTriggerRef.current = pending || null;
				setRunId(undefined);
				setAccessToken(undefined);
				setCompletionError(
					getTaskFailureMessage({
						input: pending?.input,
						errorMessage,
					}),
				);
				setStatus("FAILED");
				return;
			}
			activeTriggerRef.current = pending || null;
			setRunId(data.id);
			setAccessToken(data.publicAccessToken);
			if (monitor ?? !silent) {
				const taskDefaults = getTaskMonitorTaskDefaults(
					pending?.input.taskName,
					pending?.input.payload,
				);

				addTask({
					runId: data.id,
					accessToken: data.publicAccessToken,
					ownerId: auth.id == null ? null : String(auth.id),
					title:
						taskTitle || executingToast || taskDefaults.title || successToast,
					description:
						taskDescription || taskDefaults.description || executingToast,
					metadata: taskDefaults.metadata,
					intent: pending?.options?.intent,
				});
			}
			onStarted?.();
		},
		onError(e) {
			const pending = pendingTriggersRef.current.shift();
			activeTriggerRef.current = pending || null;
			setRunId(undefined);
			setAccessToken(undefined);
			setCompletionError(e?.error?.serverError || null);
			setStatus("FAILED");
		},
	});
	const trigger = (input: TriggerTaskInput, options?: TriggerTaskOptions) => {
		pendingTriggersRef.current.push({ input, options });
		return _action.execute(input);
	};
	const ctx = {
		trigger,
		triggerWithAuth(taskName: TaskName, payload: Record<string, unknown>) {
			return trigger({
				taskName,
				payload: {
					...payload,
					author: {
						id: auth.id,
						name: auth.name,
					},
				},
			});
		},
		isActionPending: _action.isPending,
		runId,
		accessToken,
		status,
		isLoading: status === "SYNCING",
	};
	return ctx;
}

export function useAfterTaskTrigger(func: () => void) {
	const [runningId, setRunningId] = useState<null | string>(null);
	const tasks = useTaskMonitorStore((state) => state.tasks);

	useAfterState(tasks, func);
}
