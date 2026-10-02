import { PrismaInstrumentation } from "@prisma/instrumentation";
import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";
import { esbuildPlugin } from "@trigger.dev/build/extensions";
import { additionalPackages } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk/v3";
import { lstat, realpath, symlink, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
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
      {
        name: "sharp-local-package-root",
        async onBuildComplete(context, manifest) {
          if (context.target !== "dev") return;
          // Trigger 4.5 resolves Sharp's exported entry inside dist as its package root.
          const packageRoot = await realpath(resolve(context.workingDir, "../pdf/node_modules/sharp"));
          const link = join(manifest.outputPath, "node_modules/sharp");
          const current = await lstat(link).catch(() => null);
          if (current && !current.isSymbolicLink()) return;
          if (current && await realpath(link) === packageRoot) return;
          if (current) await unlink(link);
          await symlink(packageRoot, link, "dir");
        },
      },
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
  instrumentations: [new PrismaInstrumentation()],
});
