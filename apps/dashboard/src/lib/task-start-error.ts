import { getUserErrorMessage } from "@gnd/errors";
import { ZodError } from "zod";

/**
 * Returns only messages that are safe to show for a task that failed before it
 * reached Trigger. Schema issue messages are authored by us; every other error
 * still passes through the shared public-error classifier.
 */
export function getTaskStartErrorMessage(error: unknown) {
	if (error instanceof ZodError) {
		const issueMessage = error.issues
			.map((issue) => issue.message.trim())
			.find(Boolean);
		if (issueMessage) return issueMessage;
	}

	return getUserErrorMessage(error);
}
