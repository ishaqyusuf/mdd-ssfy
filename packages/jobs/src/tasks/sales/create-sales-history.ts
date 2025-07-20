import { db } from "@gnd/db";
import { createSalesHistorySchemaTask, TaskName } from "@jobs/schema";
import { schemaTask } from "@trigger.dev/sdk/v3";

export const createSalesHistory = schemaTask({
  id: "create-sales-history" as TaskName,
  schema: createSalesHistorySchemaTask,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async ({ authorName, salesId, salesIncludeData }) => {
    const salesData = await db.salesOrders.findFirstOrThrow({
      where: {
        id: salesId,
      },
      include: salesIncludeData,
    });
    await db.salesHistory.create({
      data: {
        data: salesData,
        authorName,
        sale: {
          connect: {
            id: salesId,
          },
        },
      },
    });
  },
});
