import * as Sentry from "@sentry/bun";
import {
	isSentryEnabled,
	resolveSentryEnvironment,
	sanitizeApiSentryEvent,
} from "./observability/sentry";

const dsn = process.env.SENTRY_DSN;
const deploymentEnvironment = process.env.VERCEL_ENV;
const nodeEnvironment = process.env.NODE_ENV;
const enabled = isSentryEnabled({
	deploymentEnvironment,
	dsn,
	nodeEnvironment,
});

if (enabled) {
	Sentry.init({
		dsn,
		enabled,
		environment: resolveSentryEnvironment({
			deploymentEnvironment,
			nodeEnvironment,
		}),
		release:
			process.env.SENTRY_RELEASE ??
			process.env.VERCEL_GIT_COMMIT_SHA ??
			process.env.GIT_COMMIT_SHA,
		enableLogs: true,
		sendDefaultPii: false,
		tracesSampleRate: 0.1,
		beforeSend(event) {
			return sanitizeApiSentryEvent(event);
		},
		beforeSendTransaction(event) {
			if (event.request?.method === "OPTIONS") {
				return null;
			}

			return sanitizeApiSentryEvent(event);
		},
		initialScope: {
			tags: {
				runtime: "api",
			},
		},
	});
}
