import { UpdateSalesControl } from "../schema";
import { Db } from "../types";
import { submitNonProductionsAction, submitAssignmentsAction } from "./actions";
import { getSaleInformation } from "./get-sale-information";

export async function submitAllTask(db: Db, data: UpdateSalesControl) {
  const submitArgs = data.submitAll;
  const info = await getSaleInformation(db, {
    salesId: data.meta.salesId,
  });
  await submitAssignmentsAction(db, {
    authorId: data.meta.authorId,
    data: info,
    ...submitArgs,
  });
}
export async function submitNonProductionsTask(
  db: Db,
  data: UpdateSalesControl
) {
  const info = await getSaleInformation(db, {
    salesId: data.meta.salesId,
  });
  await submitNonProductionsAction(db, {
    data: info,
    authorId: data.meta.authorId,
  });
}
