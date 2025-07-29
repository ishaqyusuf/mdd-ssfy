import { UpdateSalesControl } from "../schema";
import { Db } from "../types";

import { getSaleInformation } from "./get-sale-information";
import { submitNonProductionsTask } from "./tasks";

export async function packItem(db: Db, data: UpdateSalesControl) {
  const info = await getSaleInformation(db, {
    salesId: data.meta.salesId,
  });
  // await submitNonProductionsTask(db, info);
}
