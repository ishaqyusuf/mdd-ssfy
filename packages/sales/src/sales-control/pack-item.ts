import { UpdateSalesControl } from "../schema";
import { Db } from "../types";
import { completeAllNonProductionsAction } from "./complete-non-production";
import { getSaleInformation } from "./get-sale-information";

export async function packItem(db: Db, data: UpdateSalesControl) {
  const info = await getSaleInformation(db, {
    salesId: data.meta.salesId,
  });
  await completeAllNonProductionsAction(db, info);
}
