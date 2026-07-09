export const SALES_EMAIL_LEDGER_PATH = "/sales-book/emails";

export const DEFAULT_TASK_FAILURE_MESSAGE =
	"The background task failed. Please try again or check the task monitor.";

export const DEFAULT_SALES_EMAIL_FAILURE_MESSAGE =
	"Email sending failed. No email was delivered.";

type TaskInputLike = {
	taskName?: string | null;
	payload?: unknown;
};

type TaskMetadataLike = {
	taskName?: string | null;
	type?: string | null;
};

type FailureMessageInput = {
	input?: TaskInputLike | null;
	metadata?: TaskMetadataLike | null;
	errorMessage?: string | null;
};

type RealtimeRunLike = {
	status?: unknown;
	isCompleted?: unknown;
	isFailed?: unknown;
	isCancelled?: unknown;
	output?: unknown;
	error?: unknown;
};

export function isSalesEmailTaskInput(input?: TaskInputLike | null) {
	if (!input) return false;
	if (input.taskName === "send-sales-email") return true;
	if (input.taskName !== "notification") return false;

	const payload = input.payload as { channel?: unknown } | null | undefined;
	return isSalesEmailNotificationChannel(payload?.channel);
}

export function isSalesEmailTaskMetadata(metadata?: TaskMetadataLike | null) {
	return metadata?.type === "sales-email";
}

export function isSalesEmailTask(input: FailureMessageInput) {
	return (
		isSalesEmailTaskInput(input.input) || isSalesEmailTaskMetadata(input.metadata)
	);
}

export function getSalesEmailOutputFailure(output: unknown) {
	const emails = (output as { emails?: unknown } | null)?.emails as
		| {
				sent?: number;
				skipped?: number;
				failed?: number;
				errorMessage?: unknown;
				error?: unknown;
		  }
		| undefined;
	if (!emails) return null;

	const sent = Number(emails.sent || 0);
	const skipped = Number(emails.skipped || 0);
	const failed = Number(emails.failed || 0);
	const explicitError = normalizeErrorMessage(
		emails.errorMessage ?? emails.error,
	);

	if (explicitError && (failed > 0 || sent === 0)) {
		return explicitError;
	}

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

export function getTaskOutputFailureMessage(input: {
	input?: TaskInputLike | null;
	metadata?: TaskMetadataLike | null;
	output: unknown;
}) {
	if (!isSalesEmailTask(input)) return null;
	return getSalesEmailOutputFailure(input.output);
}

export function getTaskFailureMessage(input: FailureMessageInput) {
	const errorMessage = input.errorMessage?.trim();
	if (errorMessage) return errorMessage;

	if (isSalesEmailTask(input)) return DEFAULT_SALES_EMAIL_FAILURE_MESSAGE;
	return DEFAULT_TASK_FAILURE_MESSAGE;
}

export function getTaskFailureTitle(input: FailureMessageInput) {
	if (isSalesEmailTask(input)) return "Email sending failed";
	return "Task failed";
}

export function getTaskStartFailureTitle(input: FailureMessageInput) {
	if (isSalesEmailTask(input)) return "Unable to start email send";
	return "Unable to start task";
}

export function getRunErrorMessage(run: unknown) {
	return normalizeErrorMessage((run as RealtimeRunLike | null)?.error);
}

export function getRunTaskOutputFailureMessage(input: {
	input?: TaskInputLike | null;
	metadata?: TaskMetadataLike | null;
	run: unknown;
}) {
	const run = input.run as RealtimeRunLike | null;
	return getTaskOutputFailureMessage({
		input: input.input,
		metadata: input.metadata,
		output: run?.output,
	});
}

export function getRunTerminalState(run: unknown) {
	const currentRun = run as RealtimeRunLike | null;
	if (!currentRun) return null;

	const status = String(currentRun.status || "").toUpperCase();

	if (
		currentRun.isFailed === true ||
		status === "FAILED" ||
		status === "ERRORED" ||
		status === "CRASHED" ||
		status === "TIMED_OUT"
	) {
		return "FAILED" as const;
	}

	if (currentRun.isCancelled === true || status === "CANCELED") {
		return "CANCELED" as const;
	}

	if (
		currentRun.isCompleted === true ||
		status === "COMPLETED" ||
		status === "SUCCESS"
	) {
		return "COMPLETED" as const;
	}

	return null;
}

function isSalesEmailNotificationChannel(channel: unknown) {
	return (
		channel === "simple_sales_document_email" ||
		channel === "composed_sales_document_email"
	);
}

function normalizeErrorMessage(error: unknown) {
	if (!error) return null;
	if (typeof error === "string") return error;
	if (error instanceof Error) return error.message;
	if (typeof error !== "object") return null;

	const maybeMessage = (error as { message?: unknown }).message;
	if (typeof maybeMessage === "string" && maybeMessage.trim()) {
		return maybeMessage;
	}

	const maybeName = (error as { name?: unknown }).name;
	if (typeof maybeName === "string" && maybeName.trim()) {
		return maybeName;
	}

	return null;
}
