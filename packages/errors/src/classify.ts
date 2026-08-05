import { AppError } from "./app-error";
import { ERROR_DESCRIPTORS } from "./descriptors";
import type {
	ErrorClassificationOptions,
	ErrorCode,
	ErrorTransportCode,
} from "./types";

const TRPC_CODE_MAP: Partial<Record<string, ErrorCode>> = {
	BAD_REQUEST: "VALIDATION_FAILED",
	CONFLICT: "CONFLICT",
	FORBIDDEN: "PERMISSION_DENIED",
	NOT_FOUND: "NOT_FOUND",
	PRECONDITION_FAILED: "CONFLICT",
	TOO_MANY_REQUESTS: "RATE_LIMITED",
	UNAUTHORIZED: "AUTHENTICATION_REQUIRED",
};

const PRISMA_CODE_MAP: Partial<Record<string, ErrorCode>> = {
	P2002: "CONFLICT",
	P2003: "DATABASE_CONSTRAINT",
	P2024: "DATABASE_POOL_TIMEOUT",
	P2028: "DATABASE_TRANSACTION_TIMEOUT",
	P2034: "DATABASE_WRITE_CONFLICT",
};

const HTTP_STATUS_MAP: Partial<Record<number, ErrorCode>> = {
	400: "VALIDATION_FAILED",
	401: "AUTHENTICATION_REQUIRED",
	403: "PERMISSION_DENIED",
	404: "NOT_FOUND",
	409: "CONFLICT",
	412: "CONFLICT",
	422: "VALIDATION_FAILED",
	429: "RATE_LIMITED",
};

const TECHNICAL_MESSAGE_PATTERN =
	/(?:\bprisma\b|\bp\d{4}\b|transaction (?:api|already closed|expired|timed out)|unique constraint|foreign key constraint|\bsql\b|database|connection pool|stack trace|cannot read propert|is not a function|\bat\s+[\w$.]+\s*\(|econn(?:reset|refused)|enotfound)/i;

type ErrorRecord = Record<string, unknown> & {
	cause?: unknown;
	code?: unknown;
	issues?: unknown;
	message?: unknown;
	name?: unknown;
	status?: unknown;
	statusCode?: unknown;
};

function asErrorRecord(error: unknown): ErrorRecord | null {
	return typeof error === "object" && error !== null
		? (error as ErrorRecord)
		: null;
}

function readMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	const record = asErrorRecord(error);
	return typeof record?.message === "string" ? record.message : undefined;
}

function readCode(error: unknown) {
	const record = asErrorRecord(error);
	return typeof record?.code === "string" ? record.code : undefined;
}

function readStatus(error: unknown) {
	const record = asErrorRecord(error);
	const status = record?.status ?? record?.statusCode;
	return typeof status === "number" ? status : undefined;
}

function isTrpcErrorLike(error: unknown) {
	const record = asErrorRecord(error);
	return (
		record?.name === "TRPCError" ||
		Boolean(TRPC_CODE_MAP[readCode(error) ?? ""])
	);
}

function isPrismaErrorLike(error: unknown) {
	const record = asErrorRecord(error);
	const code = readCode(error);
	return (
		Boolean(code?.startsWith("P")) ||
		(typeof record?.name === "string" && record.name.startsWith("PrismaClient"))
	);
}

function isValidationErrorLike(error: unknown) {
	const record = asErrorRecord(error);
	return record?.name === "ZodError" || Array.isArray(record?.issues);
}

function createClassifiedError(
	code: ErrorCode,
	error: unknown,
	options: ErrorClassificationOptions,
	reportable?: boolean,
) {
	const message = readMessage(error);

	return new AppError({
		cause: error,
		code,
		internalMessage: message,
		operation: options.operation,
		publicMessage:
			options.publicMessage ?? ERROR_DESCRIPTORS[code].publicMessage,
		referenceId: options.referenceId,
		reportable,
	});
}

function hasCustomTransportMessage(error: unknown) {
	const code = readCode(error);
	const message = readMessage(error)?.trim();
	return Boolean(
		message && message !== code && message !== "HTTP request failed",
	);
}

function shouldReportUntypedTransport(error: unknown, code: ErrorCode) {
	if (code === "UNEXPECTED") return true;
	return TECHNICAL_MESSAGE_PATTERN.test(readMessage(error) ?? "");
}

export function classifyError(
	error: unknown,
	options: ErrorClassificationOptions = {},
): AppError {
	if (error instanceof AppError) return error;

	const cause = asErrorRecord(error)?.cause;
	if (cause instanceof AppError) return cause;
	if (cause && cause !== error) {
		const classifiedCause = classifyError(cause, options);
		if (classifiedCause.code !== "UNEXPECTED") return classifiedCause;
	}

	if (isValidationErrorLike(error)) {
		return createClassifiedError("VALIDATION_FAILED", error, options);
	}

	const code = readCode(error);
	if (isPrismaErrorLike(error)) {
		return createClassifiedError(
			PRISMA_CODE_MAP[code ?? ""] ?? "UNEXPECTED",
			error,
			options,
		);
	}

	if (isTrpcErrorLike(error)) {
		const mappedCode = TRPC_CODE_MAP[code ?? ""] ?? "UNEXPECTED";
		return createClassifiedError(
			mappedCode,
			error,
			options,
			hasCustomTransportMessage(error) &&
				shouldReportUntypedTransport(error, mappedCode)
				? true
				: undefined,
		);
	}

	const status = readStatus(error);
	if (status) {
		const mappedCode = HTTP_STATUS_MAP[status] ?? "UNEXPECTED";
		return createClassifiedError(
			mappedCode,
			error,
			options,
			hasCustomTransportMessage(error) &&
				shouldReportUntypedTransport(error, mappedCode)
				? true
				: undefined,
		);
	}

	const message = readMessage(error)?.toLowerCase() ?? "";
	if (
		message.includes("econnreset") ||
		message.includes("econnrefused") ||
		message.includes("enotfound") ||
		message.includes("network request failed") ||
		message.includes("failed to fetch")
	) {
		return createClassifiedError("NETWORK_UNAVAILABLE", error, options);
	}

	return createClassifiedError("UNEXPECTED", error, options);
}

export function isErrorTransportCode(
	value: string,
): value is ErrorTransportCode {
	return value in TRPC_CODE_MAP || value === "INTERNAL_SERVER_ERROR";
}
