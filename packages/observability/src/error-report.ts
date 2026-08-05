import { AppError, classifyError } from "@gnd/errors";

export type ErrorMetadataValue = boolean | number | string | null | undefined;

export type ErrorReportContext = {
	extra?: Record<string, ErrorMetadataValue>;
	operation?: string;
	requestId?: string;
	runtime:
		| "api"
		| "dashboard"
		| "dealership"
		| "jobs"
		| "mobile"
		| "storefront"
		| "web";
	source: string;
	tags?: Record<string, ErrorMetadataValue>;
};

type CaptureLevel = "error" | "fatal" | "info" | "warning";

export type ErrorCaptureContext = {
	extra: Record<string, boolean | number | string | null>;
	fingerprint: string[];
	level: CaptureLevel;
	tags: Record<string, string>;
};

const SENSITIVE_KEY_PATTERN =
	/(?:address|authorization|body|cookie|customer|email|input|password|payload|payment|secret|token|user)/i;

function isAllowedKey(key: string) {
	return !SENSITIVE_KEY_PATTERN.test(key);
}

function sanitizeValue(value: ErrorMetadataValue) {
	if (value === undefined) return undefined;
	if (typeof value === "string") return value.slice(0, 200);
	return value;
}

function sanitizeExtra(input: Record<string, ErrorMetadataValue> | undefined) {
	const output: Record<string, boolean | number | string | null> = {};
	for (const [key, rawValue] of Object.entries(input ?? {})) {
		if (!isAllowedKey(key)) continue;
		const value = sanitizeValue(rawValue);
		if (value !== undefined) output[key] = value;
	}
	return output;
}

function sanitizeTags(input: Record<string, ErrorMetadataValue> | undefined) {
	const output: Record<string, string> = {};
	for (const [key, rawValue] of Object.entries(input ?? {})) {
		if (!isAllowedKey(key)) continue;
		const value = sanitizeValue(rawValue);
		if (value !== undefined && value !== null) output[key] = String(value);
	}
	return output;
}

function toCaptureLevel(level: AppError["severity"]): CaptureLevel {
	if (level === "warning") return "warning";
	return level;
}

export function getReportableError(error: unknown) {
	if (error instanceof AppError && error.cause instanceof Error) {
		return error.cause;
	}
	return error instanceof Error ? error : new Error(String(error));
}

export function shouldReportError(error: unknown) {
	return classifyError(error).reportable;
}

export function buildErrorReport(error: unknown, context: ErrorReportContext) {
	const classified = classifyError(error, { operation: context.operation });
	const operation = classified.operation ?? context.operation;
	const tags: Record<string, string> = {
		...sanitizeTags(context.tags),
		error_category: classified.category,
		error_code: classified.code,
		error_reference: classified.referenceId,
		...(operation ? { operation } : {}),
		...(context.requestId ? { request_id: context.requestId } : {}),
		retryable: String(classified.retryable),
		runtime: context.runtime,
		source: context.source,
	};

	return {
		captureContext: {
			extra: sanitizeExtra(context.extra),
			fingerprint: [classified.code, operation ?? "unknown"],
			level: toCaptureLevel(classified.severity),
			tags,
		} satisfies ErrorCaptureContext,
		classified,
		reportableError: getReportableError(classified),
	};
}
