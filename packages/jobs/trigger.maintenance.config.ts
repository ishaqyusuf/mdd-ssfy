// Incident release: same existing Production entrypoints; see Brain release evidence.
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";
import { esbuildPlugin } from "@trigger.dev/build/extensions";
import { additionalPackages } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk/v3";
import { getSentrySourceMapUploadConfig } from "./src/observability/sentry";

const sentrySourceMapUpload = getSentrySourceMapUploadConfig({
  authToken: process.env.SENTRY_AUTH_TOKEN,
  environment: process.env.SENTRY_ENVIRONMENT,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT_BACKEND,
  release: process.env.SENTRY_RELEASE,
});
const triggerProjectId =
  process.env.TRIGGER_PROJECT_ID?.trim() || "proj_caklyqpkhwrtmdbtjhjs";

export default defineConfig({
  project: triggerProjectId,
  runtime: "node",
  logLevel: "log",
  maxDuration: 60,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  build: {
    extensions: [
      additionalPackages({ packages: ["vercel@54.4.1"] }),
      ...(sentrySourceMapUpload
        ? [
            esbuildPlugin(
              sentryEsbuildPlugin({
                org: sentrySourceMapUpload.org,
                project: sentrySourceMapUpload.project,
                authToken: sentrySourceMapUpload.authToken,
                release: sentrySourceMapUpload.release
                  ? { name: sentrySourceMapUpload.release }
                  : undefined,
                sourcemaps: {
                  filesToDeleteAfterUpload: ["**/*.map"],
                },
              }),
              { placement: "last", target: "deploy" },
            ),
          ]
        : []),
      // syncVercelEnvVars({
      //   projectId: process.env.PROJECT_ID_VERCEL!,
      //   vercelAccessToken: process.env.VERCEL_TRIGGER_ACCESS_TOKEN!,
      // }),
      prismaExtension({
        mode: "legacy",
        // version: "5.20.0", // optional, we'll automatically detect the version if not provided
        // update this to the path of your Prisma schema file
        version: "^6.5.0",
        directUrlEnvVarName: "DATABASE_URL", //process.env.DATABASE_URL!,
        schema: "./src/schema.prisma",
        // typedSql: true,
        // migrate: true,
      }),
    ],
    external: ["canvas", "next"],
  },
  dirs: ["./src/tasks", "../../apps/api/src/assistant/tasks"],
  ignorePatterns: [
  "**/*.test.*",
  "**/*.spec.*",
  "../../apps/api/src/assistant/tasks/**",
  "src/tasks/assistant/conversation-retention.test.ts",
  "src/tasks/assistant/conversation-retention.ts",
  "src/tasks/assistant/diagnostic-retention.test.ts",
  "src/tasks/assistant/diagnostic-retention.ts",
  "src/tasks/assistant/staged-document-retention.test.ts",
  "src/tasks/assistant/staged-document-retention.ts",
  "src/tasks/bug-reports/deliver-issues.ts",
  "src/tasks/contractor-accounting/schedule-next-run.test.ts",
  "src/tasks/contractor-accounting/schedule-next-run.ts",
  "src/tasks/init.ts",
  "src/tasks/notifications/channel-options.ts",
  "src/tasks/notifications/fulfillment-notice-sweep.ts",
  "src/tasks/notifications/fulfillment-notices.ts",
  "src/tasks/reliability/github-recovery.ts",
  "src/tasks/reliability/sentry-reconciliation.ts",
  "src/tasks/reliability/trigger-reconciliation.ts",
  "src/tasks/reliability/vercel-reconciliation.ts",
  "src/tasks/sales-request-mailbox/composition.test.ts",
  "src/tasks/sales-request-mailbox/composition.ts",
  "src/tasks/sales-request-mailbox/runtime.test.ts",
  "src/tasks/sales-request-mailbox/runtime.ts",
  "src/tasks/sales-request-mailbox/sweep.test.ts",
  "src/tasks/sales-request-mailbox/sweep.ts",
  "src/tasks/sales-request-mailbox/tasks.ts",
  "src/tasks/sales/assistant-pdf-controls.test.ts",
  "src/tasks/sales/assistant-pdf-controls.ts",
  "src/tasks/sales/assistant-pdf-lifecycle.test.ts",
  "src/tasks/sales/assistant-pdf-lifecycle.ts",
  "src/tasks/sales/backfill-sales-inventory-line-items.test.ts",
  "src/tasks/sales/create-sales-history.test.ts",
  "src/tasks/sales/create-send-sales-email-task.ts",
  "src/tasks/sales/daily-payment-report-period.ts",
  "src/tasks/sales/dispatch-duplicate-cleanup.test.ts",
  "src/tasks/sales/dispatch-duplicate-cleanup.ts",
  "src/tasks/sales/migrate-sales-inventory-legacy-status.test.ts",
  "src/tasks/sales/sales-adjustment-apply-recovery.test.ts",
  "src/tasks/sales/sales-adjustment-apply-recovery.ts",
  "src/tasks/sales/sales-adjustment-door-projection.test.ts",
  "src/tasks/sales/sales-adjustment-door-projection.ts",
  "src/tasks/sales/sales-adjustment-grouped-projection.test.ts",
  "src/tasks/sales/sales-adjustment-grouped-projection.ts",
  "src/tasks/sales/sales-adjustment-relational-projection.test.ts",
  "src/tasks/sales/sales-adjustment-relational-projection.ts",
  "src/tasks/sales/sales-adjustment-service-creation.test.ts",
  "src/tasks/sales/sales-handoff-escalation-schedule.test.ts",
  "src/tasks/sales/sales-handoff-reconciliation-schedule.test.ts",
  "src/tasks/sales/sales-pdf-artifact-cleanup.test.ts",
  "src/tasks/sales/sales-pdf-artifact-cleanup.ts",
  "src/tasks/sales/sales-request-generation-retention.test.ts",
  "src/tasks/sales/sales-request-generation-retention.ts",
  "src/tasks/sales/send-sales-email-schema.ts",
  "src/tasks/sales/update-sales-control-permissions.test.ts",
  "src/tasks/storefront/lifecycle.ts",
  "src/tasks/storefront/send-storefront-custom-inquiry-notifications.test.ts",
  "src/tasks/storefront/storefront-lifecycle-schedule.test.ts"
],
  instrumentations: [new PrismaInstrumentation()],
});
