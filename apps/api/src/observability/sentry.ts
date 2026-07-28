import * as Sentry from "@sentry/bun";
import type { TRPCError } from "@trpc/server";

type TrpcErrorDetails = {
	error: TRPCError;
	path?: string;
	type: "query" | "mutation" | "subscription" | "unknown";
	router: "app" | "storefront";
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
	return deploymentEnvironment ?? nodeEnvironment ?? "development";
}

export function isSentryEnabled({
	deploymentEnvironment,
	dsn,
	nodeEnvironment,
}: SentryEnvironmentInput) {
	return (
		resolveSentryEnvironment({
			deploymentEnvironment,
			nodeEnvironment,
		}) === "production" && Boolean(dsn)
	);
}

export function sanitizeApiSentryEvent(event: Sentry.Event) {
	const sanitizedEvent = { ...event, user: undefined };

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
}: TrpcErrorDetails) {
	if (!shouldCaptureTrpcError(error.code)) {
		return;
	}

	Sentry.captureException(error, {
		tags: {
			runtime: "api",
			source: "trpc",
			router,
			procedure: path ?? "unknown",
			procedure_type: type,
		},
	});
}

export function shouldCaptureTrpcError(code: TRPCError["code"]) {
	return code === "INTERNAL_SERVER_ERROR";
}

export function captureApiError(
	error: Error,
	request: { method: string },
) {
	Sentry.captureException(error, getApiErrorContext(request));
}

export function getApiErrorContext(request: { method: string }) {
	return {
		tags: {
			runtime: "api",
			source: "hono",
			method: request.method,
		},
	};
}
