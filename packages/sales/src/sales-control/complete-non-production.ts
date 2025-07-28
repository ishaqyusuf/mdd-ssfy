import { RenturnTypeAsync } from "@gnd/utils";
import { UpdateSalesControl } from "../schema";
import { Db } from "../types";
import { getSaleInformation } from "./get-sale-information";
import { hasQty } from "@gnd/utils/sales";

export async function completeAllNonProductions(
  db: Db,
  data: UpdateSalesControl
) {
  const info = await getSaleInformation(db, {
    salesId: data.meta.salesId,
  });
  await completeAllNonProductionsAction(db, info);
}
export async function completeAllNonProductionsAction(
  db: Db,
  data: RenturnTypeAsync<typeof getSaleInformation>
) {
  for (const item of data.items) {
    if (!item.itemConfig?.production) {
      for (const s of item.analytics?.pendingSubmissions!) {
        if (hasQty(s.qty)) {
          // submit qties
        }
      }
    }
  }
}
