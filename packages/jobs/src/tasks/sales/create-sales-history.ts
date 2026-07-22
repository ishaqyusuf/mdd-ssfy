import { createSalesHistorySchemaTask, TaskName } from "../../schema";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { copySales } from "@sales/copy-sales";
import { createNoteAction } from "@notifications/note";
import { db } from "@gnd/db";
import { noteTagFilter } from "@notifications/utils";

export const createSalesHistory = schemaTask({
  id: "create-sales-history" as TaskName,
  schema: createSalesHistorySchemaTask,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
		const salesNo = props.salesNo;
		if (!salesNo) {
			throw new Error("Sales history requires a sales number.");
		}
    //TODO: before creating a new history, compare current sales record with last history, if there is any change, then create a history,
    // compare basically all important record used in copySales. such as: unitCost, grandTotal, items: total,qty,description,swing, stepItems: price,value etc, hpt, doors etc.
    const result = await copySales({
      db: db,
      as: props.salesType == "order" ? "order-hx" : "quote-hx",
      salesUid: salesNo,
      author: props.author,
      type: props.salesType,
    });
		if (!result.slug) {
			throw new Error("Sales history copy did not produce a slug.");
		}
    await createNoteAction({
      authorId: props.author.id,
      db,
      note: ``,
      tags: [
        noteTagFilter("salesNo", result.slug),
        noteTagFilter(
          "activity",
          props.salesType == "order"
            ? "sales_invoice_updated"
            : "quote_invoice_updated",
        ),
      ],
    });
  },
});
