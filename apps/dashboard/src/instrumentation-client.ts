// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import {
    resolveSentryEnvironment,
    shouldEnableSentry,
} from "./lib/sentry-environment";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const deploymentEnvironment = process.env.NEXT_PUBLIC_VERCEL_ENV;
const nodeEnvironment = process.env.NODE_ENV;

Sentry.init({
    dsn,
    environment: resolveSentryEnvironment({
        deploymentEnvironment,
        nodeEnvironment,
    }),
    enabled: shouldEnableSentry({
        deploymentEnvironment,
        dsn,
        nodeEnvironment,
    }),
    sendDefaultPii: false,

    // Add optional integrations for additional features
    integrations: [
        Sentry.replayIntegration({
            blockAllMedia: true,
            maskAllText: true,
        }),
    ],

    // Keep production tracing useful without exhausting the Sentry quota.
    tracesSampleRate: 0.1,
    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Define how likely Replay events are sampled.
    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.1,

    // Define how likely Replay events are sampled when an error occurs.
    replaysOnErrorSampleRate: 1.0,

    debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
