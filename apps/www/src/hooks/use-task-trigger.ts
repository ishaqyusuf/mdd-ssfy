import { triggerTask } from "@/actions/trigger-task";
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
	onError?;
	onSuccess?;
	onStarted?;
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

function isSalesEmailTrigger(input?: TriggerTaskInput | null) {
	if (!input) return false;
	if (input.taskName === "send-sales-email") return true;
	if (input.taskName !== "notification") return false;
	const payload = input.payload as { channel?: string } | null | undefined;
	return (
		payload?.channel === "simple_sales_document_email" ||
		payload?.channel === "composed_sales_document_email"
	);
}

function getSalesEmailOutputFailure(
	input: TriggerTaskInput | null | undefined,
	output: unknown,
) {
	if (!isSalesEmailTrigger(input)) return null;
	const emails = (output as { emails?: unknown } | null)?.emails as
		| {
				sent?: number;
				skipped?: number;
				failed?: number;
		  }
		| undefined;
	if (!emails) return null;

	const sent = Number(emails.sent || 0);
	const skipped = Number(emails.skipped || 0);
	const failed = Number(emails.failed || 0);

	if (failed > 0) {
		return failed === 1
			? "Email provider reported 1 failed message."
			: `Email provider reported ${failed} failed messages.`;
	}

	if (sent === 0 && skipped > 0) {
		return "Email was skipped before it could be sent.";
	}

	return null;
}

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
	const pendingTriggersRef = useRef<PendingTrigger[]>([]);
	const activeTriggerRef = useRef<PendingTrigger | null>(null);
	useEffect(() => {
		if (status === "FAILED") {
			// setIsImporting(false);
			setRunId(undefined);
			if (!silent && completionError)
				toast({
					duration: 3500,
					variant: "error",
					title: errorToast,
					description: completionError,
				});
			onError?.();
		}
	}, [completionError, errorToast, onError, silent, status]);
	useEffect(() => {
		if (error || run?.status === "FAILED") {
			setCompletionError(error?.message || null);
			setStatus("FAILED");
		}

		if (run?.status === "COMPLETED") {
			const outputFailure = getSalesEmailOutputFailure(
				activeTriggerRef.current?.input,
				run.output,
			);
			if (outputFailure) {
				setCompletionError(outputFailure);
				setStatus("FAILED");
				return;
			}

			setCompletionError(null);
			setStatus("COMPLETED");
			onSuccess?.();
		}
	}, [error, onSuccess, run]);
	useEffect(() => {
		if (status === "COMPLETED") {
			setRunId(undefined);
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
			// if (executingToast)
			//     if (!props.silent)
			//         toast({
			//             duration: Number.POSITIVE_INFINITY,
			//             variant: "spinner",
			//             title: executingToast,
			//         });
		},
		onSuccess({ data }) {
			const pending = pendingTriggersRef.current.shift();
			// if (props?.debug) console.log({ data });
			if (!data?.id || !data?.publicAccessToken) {
				activeTriggerRef.current = null;
				setRunId(undefined);
				setAccessToken(undefined);
				setStatus("FAILED");
				if (!silent)
					toast({
						duration: 3500,
						variant: "error",
						description: errorToast,
						title: "Unable to start task",
					});
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
			pendingTriggersRef.current.shift();
			activeTriggerRef.current = null;
			setRunId(undefined);
			setCompletionError(e?.error?.serverError || null);
			onError?.();
			if (!silent)
				toast({
					duration: 3500,
					variant: "error",
					description: errorToast,
					title: e?.error?.serverError,
				});
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
