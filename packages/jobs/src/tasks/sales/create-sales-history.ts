import {
  type CreateSalesHistorySchemaTask,
  createSalesHistorySchemaTask,
  type TaskName,
} from "../../schema";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { copySales } from "@sales/copy-sales";
import { createNoteAction } from "@notifications/note";
import { db } from "@gnd/db";
import { noteTagFilter } from "@notifications/utils";

type CreateSalesHistoryDependencies = {
  copySales: typeof copySales;
  createNoteAction: typeof createNoteAction;
  db: typeof db;
};

export async function runCreateSalesHistory(
  props: CreateSalesHistorySchemaTask,
  dependencies: CreateSalesHistoryDependencies = {
    copySales,
    createNoteAction,
    db,
  },
) {
  const salesNo = props.salesNo;
  if (!salesNo) {
    throw new Error("Sales history requires a sales number.");
  }
  const result = await dependencies.copySales({
    db: dependencies.db,
    as: props.salesType === "order" ? "order-hx" : "quote-hx",
    salesUid: salesNo,
    author: props.author,
    type: props.salesType,
  });
  if (result.error) {
    throw new Error(result.error);
  }
  if (!result.slug) {
    throw new Error("Sales history copy did not produce a slug.");
  }
  await dependencies.createNoteAction({
    authorId: props.author.id,
    db: dependencies.db,
    note: "",
    tags: [
      noteTagFilter("salesNo", result.slug),
      noteTagFilter(
        "activity",
        props.salesType === "order"
          ? "sales_invoice_updated"
          : "quote_invoice_updated",
      ),
    ],
  });
}

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
    return runCreateSalesHistory(props);
  },
});
