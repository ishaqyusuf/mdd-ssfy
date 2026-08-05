import {
	isObservabilityEnabled,
	resolveObservabilityEnvironment,
} from "@gnd/observability";
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const deploymentEnvironment = process.env.NEXT_PUBLIC_VERCEL_ENV;
const nodeEnvironment = process.env.NODE_ENV;

Sentry.init({
	dsn,
	enabled: isObservabilityEnabled({
		deploymentEnvironment,
		dsn,
		nodeEnvironment,
	}),
	environment: resolveObservabilityEnvironment({
		deploymentEnvironment,
		nodeEnvironment,
	}),
	sendDefaultPii: false,
	tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
