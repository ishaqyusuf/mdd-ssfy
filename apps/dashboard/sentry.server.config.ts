// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import {
    resolveSentryEnvironment,
    shouldEnableSentry,
} from "./src/lib/sentry-environment";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const deploymentEnvironment = process.env.VERCEL_ENV;
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

    // Keep production tracing useful without exhausting the Sentry quota.
    tracesSampleRate: 0.1,

    enableLogs: true,
    debug: false,
});
