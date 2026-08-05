import { classifyError } from "./classify";
import { ERROR_DESCRIPTORS } from "./descriptors";
import type { ErrorClassificationOptions, PublicError } from "./types";

const HTTP_STATUS_BY_TRANSPORT = {
	BAD_REQUEST: 400,
	CONFLICT: 409,
	FORBIDDEN: 403,
	INTERNAL_SERVER_ERROR: 500,
	NOT_FOUND: 404,
	PRECONDITION_FAILED: 412,
	TOO_MANY_REQUESTS: 429,
	UNAUTHORIZED: 401,
} as const;

function isPublicError(value: unknown): value is PublicError {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Partial<PublicError>;
	return (
		typeof candidate.code === "string" &&
		candidate.code in ERROR_DESCRIPTORS &&
		typeof candidate.message === "string" &&
		typeof candidate.referenceId === "string" &&
		typeof candidate.retryable === "boolean"
	);
}

function readNestedPublicError(error: unknown) {
	if (typeof error !== "object" || error === null) return null;
	const candidate = error as {
		data?: { appError?: unknown };
		shape?: { data?: { appError?: unknown } };
	};
	const nested = candidate.data?.appError ?? candidate.shape?.data?.appError;
	return isPublicError(nested) ? nested : null;
}

export function toPublicError(
	error: unknown,
	options: ErrorClassificationOptions = {},
): PublicError {
	const classified = classifyError(error, options);
	return {
		action: classified.action,
		code: classified.code,
		message: classified.publicMessage,
		referenceId: classified.referenceId,
		retryable: classified.retryable,
	};
}

export function getPublicError(
	error: unknown,
	options: ErrorClassificationOptions = {},
) {
	return readNestedPublicError(error) ?? toPublicError(error, options);
}

export function getUserErrorMessage(
	error: unknown,
	options: ErrorClassificationOptions = {},
) {
	return getPublicError(error, options).message;
}

export function getPublicErrorHttpStatus(error: unknown) {
	return HTTP_STATUS_BY_TRANSPORT[classifyError(error).transportCode];
}
