import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
    project: "proj_caklyqpkhwrtmdbtjhjs",
    // project: env.TRIGGER_PROJECT_ID,
    runtime: "node",
    logLevel: "log",
    // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
    // You can override this on an individual task.
    // See https://trigger.dev/docs/runs/max-duration
    maxDuration: 3600,
    retries: {
        enabledInDev: true,
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
            //     projectId: env.VERCEL_PROJECT_ID,
            // }),
            prismaExtension({
                // version: "5.20.0", // optional, we'll automatically detect the version if not provided
                // update this to the path of your Prisma schema file
                version: "^6.3.1",
                schema: "../../packages/db/src/schema",
                typedSql: true,
                migrate: true,
            }),
        ],
    },
    dirs: ["./trigger"],
});
