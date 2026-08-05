import {
	buildErrorReport,
	isObservabilityEnabled,
	resolveObservabilityEnvironment,
} from "@gnd/observability";
import * as Sentry from "@sentry/bun";
import type { TRPCError } from "@trpc/server";

type TrpcErrorDetails = {
	error: TRPCError;
	path?: string;
	type: "query" | "mutation" | "subscription" | "unknown";
	router: "app" | "storefront";
	requestId?: string;
};

type SentryEnvironmentInput = {
	deploymentEnvironment?: string;
	dsn?: string;
	nodeEnvironment?: string;
};

export function resolveSentryEnvironment({
	deploymentEnvironment,
	nodeEnvironment,
}: Omit<SentryEnvironmentInput, "dsn">) {
	return resolveObservabilityEnvironment({
		deploymentEnvironment,
		nodeEnvironment,
	});
}

export function isSentryEnabled({
	deploymentEnvironment,
	dsn,
	nodeEnvironment,
}: SentryEnvironmentInput) {
	return isObservabilityEnabled({
		deploymentEnvironment,
		dsn,
		nodeEnvironment,
	});
}

export function sanitizeApiSentryEvent<TEvent extends Sentry.Event>(
	event: TEvent,
): TEvent {
	const sanitizedEvent: TEvent = { ...event, user: undefined };

	if (sanitizedEvent.request) {
		sanitizedEvent.request = sanitizedEvent.request.method
			? { method: sanitizedEvent.request.method }
			: {};
	}

	return sanitizedEvent;
}

export function captureTrpcError({
	error,
	path,
	type,
	router,
	requestId,
}: TrpcErrorDetails) {
	const report = buildErrorReport(error, {
		operation: path,
		requestId,
		runtime: "api",
		source: "trpc",
		tags: {
			procedure_type: type,
			router,
		},
	});
	if (!report.classified.reportable) {
		return;
	}

	Sentry.captureException(report.reportableError, report.captureContext);
}

export function shouldCaptureTrpcError(error: TRPCError) {
	return buildErrorReport(error, {
		runtime: "api",
		source: "trpc",
	}).classified.reportable;
}

export function captureApiError(
	error: unknown,
	request: { method: string; requestId?: string },
) {
	const report = buildErrorReport(error, {
		requestId: request.requestId,
		runtime: "api",
		source: "hono",
		tags: { method: request.method },
	});
	if (!report.classified.reportable) return;

	Sentry.captureException(report.reportableError, report.captureContext);
}

export function getApiErrorContext(request: {
	method: string;
	requestId?: string;
}) {
	return buildErrorReport(new Error("API request failed"), {
		requestId: request.requestId,
		runtime: "api",
		source: "hono",
		tags: { method: request.method },
	}).captureContext;
}
