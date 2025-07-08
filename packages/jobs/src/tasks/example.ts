import { exampleTaskPayload } from "@jobs/schema";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { prisma } from "@school-clerk/db";
const BATCH_SIZE = 500;

export const example = schemaTask({
  id: "example-task",
  schema: exampleTaskPayload,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async ({}) => {
    await logger.info("Starting example task");
    const user = await prisma.user.findFirst({});
    await logger.log(JSON.stringify(user));
    let offset = 0;
  },
});
