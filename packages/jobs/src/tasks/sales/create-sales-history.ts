import { createSalesHistorySchemaTask, TaskName } from "@jobs/schema";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { copySales } from "@sales/copy-sales";
import { db } from "@gnd/db";
export const createSalesHistory = schemaTask({
  id: "create-sales-history" as TaskName,
  schema: createSalesHistorySchemaTask,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    //TODO: before creating a new history, compare current sales record with last history, if there is any change, then create a history,
    // compare basically all important record used in copySales. such as: unitCost, grandTotal, items: total,qty,description,swing, stepItems: price,value etc, hpt, doors etc.
    await copySales({
      db: db,
      as: props.salesType == "order" ? "order-hx" : "quote-hx",
      salesUid: props.salesNo,
      author: props.author,
    });
  },
});
