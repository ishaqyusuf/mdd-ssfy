// import { env } from "process";
import { defineConfig } from "@trigger.dev/sdk/v3";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { syncVercelEnvVars } from "@trigger.dev/build/extensions/core";
import { env } from "process";
export default defineConfig({
    // project: "proj_caklyqpkhwrtmdbtjhjs", // Your project reference
    project: env.TRIGGER_PROJECT_ID,
    //
    // Your other config settings...
    build: {
        extensions: [
            syncVercelEnvVars(),
            prismaExtension({
                // version: "5.20.0", // optional, we'll automatically detect the version if not provided
                // update this to the path of your Prisma schema file
                schema: "prisma/schema",
                typedSql: true,
                migrate: true,
            }),
        ],
    },
});
