import { logger, task, wait } from "@trigger.dev/sdk/v3";

import { PrismaClient } from "@gnd/db";

const prisma = new PrismaClient();
export const helloWorldTask = task({
    id: "hello-world",
    // Set an optional maxDuration to prevent tasks from running indefinitely
    maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
    run: async (payload: any, { ctx }) => {
        logger.log("Hello, world!", { payload, ctx });
        const v = await prisma.users.findMany({
            take: 1,
        });
        console.log({ v });
        // await wait.for({ seconds: 5 });

        return {
            v,
            message: "Hello, world!!!!",
        };
    },
});
