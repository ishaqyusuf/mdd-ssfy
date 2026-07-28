import * as Sentry from "@sentry/node";
import { tasks } from "@trigger.dev/sdk/v3";
import {
	getSentryTaskFailureContext,
	isSentryEnabled,
	shouldCaptureSentryTaskFailure,
} from "../observability/sentry";

const dsn = process.env.SENTRY_DSN;
const environment = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV;
const enabled = isSentryEnabled({
	environment,
	nodeEnv: process.env.NODE_ENV,
	dsn,
});

if (enabled) {
	Sentry.init({
		dsn,
		enabled,
		environment,
		release: process.env.SENTRY_RELEASE,
		enableLogs: true,
		sendDefaultPii: false,
		tracesSampleRate: 0.1,
		initialScope: {
			tags: {
				runtime: "jobs",
			},
		},
	});
}

tasks.onFailure(async ({ error, ctx, task }) => {
	if (
		!shouldCaptureSentryTaskFailure({
			enabled,
			environmentType: ctx.environment.type,
		})
	) {
		return;
	}

	Sentry.captureException(error, getSentryTaskFailureContext(ctx, task));

	await Sentry.flush(2_000);
});
