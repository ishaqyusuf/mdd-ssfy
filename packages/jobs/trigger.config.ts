import { PrismaInstrumentation } from "@prisma/instrumentation";
import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";
import { esbuildPlugin } from "@trigger.dev/build/extensions";
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
  dirs: ["./src/tasks"],
  instrumentations: [new PrismaInstrumentation()],
});
