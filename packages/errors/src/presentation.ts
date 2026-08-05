import { ERROR_DESCRIPTORS } from "./descriptors";
import { getPublicError } from "./public-error";
import type { ErrorClassificationOptions } from "./types";

export function getErrorPresentation(
	error: unknown,
	options: ErrorClassificationOptions = {},
) {
	const publicError = getPublicError(error, options);
	return {
		action: publicError.action,
		description: publicError.message,
		reference: `Reference: ${publicError.referenceId}`,
		retryable: publicError.retryable,
		title: ERROR_DESCRIPTORS[publicError.code].title,
	};
}
