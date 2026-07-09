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

function isSalesEmailNotificationChannel(channel: unknown) {
	return (
		channel === "simple_sales_document_email" ||
		channel === "composed_sales_document_email"
	);
}
