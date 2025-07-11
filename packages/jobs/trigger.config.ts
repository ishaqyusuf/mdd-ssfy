import { defineConfig } from "@trigger.dev/sdk/v3";
import { syncVercelEnvVars } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { PrismaInstrumentation } from "@prisma/instrumentation";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
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
    external: ["canvas"],
  },
  dirs: ["./src/tasks"],
  instrumentations: [new PrismaInstrumentation()],
});
