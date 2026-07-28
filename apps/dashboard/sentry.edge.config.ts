// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
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
