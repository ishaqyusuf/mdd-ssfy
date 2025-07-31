import { updateSalesItemControlAction, updateSalesStatControlAction } from ".";
import {
  DeletePackingSchema,
  GetFullSalesDataSchema,
  UpdateSalesControl,
} from "../schema";
import { Db, DispatchItemPackingStatus } from "../types";
import {
  submitNonProductionsAction,
  submitAssignmentsAction,
  packDispatchItemsAction,
} from "./actions";
import { getSaleInformation } from "./get-sale-information";

export async function submitAllTask(db: Db, data: UpdateSalesControl) {
  const submitArgs = data.submitAll;
  const info = await getSaleInformation(db, {
    salesId: data.meta.salesId,
  });
  await db.$transaction(
    async (tx) => {
      await submitAssignmentsAction(tx as any, {
        authorId: data.meta.authorId,
        data: info,
        ...submitArgs,
      });
    },
    {
      maxWait: 30 * 1000,
    }
  );
}
export async function submitNonProductionsTask(
  db: Db,
  data: UpdateSalesControl
) {
  const info = await getSaleInformation(db, {
    salesId: data.meta.salesId,
  });
  const response = await db.$transaction(
    async (tx) => {
      return await submitNonProductionsAction(tx as any, {
        data: info,
        authorId: data.meta.authorId,
      });
    },
    {
      maxWait: 30 * 1000,
    }
  );
  return {
    info,
    response,
  };
}
export async function deletePackingItem(db: Db, data: DeletePackingSchema) {
  await db.orderItemDelivery.updateMany({
    where: {
      id: !data.packingUid ? data.packingId! : undefined,
      packingUid: data.packingUid ? data.packingUid : undefined,
    },
    data: {
      packingStatus: "unpacked" as DispatchItemPackingStatus,
      packedBy: data.deleteBy,
    },
  });
}
export async function packDispatchItemTask(db: Db, data: UpdateSalesControl) {
  // const notProds = await submitNonProductionsTask(db, data);
  // let info = !notProds?.response?.updated
  //   ? notProds?.info
  //   : await getSaleInformation(db, {
  //       salesId: data.meta.salesId,
  //     });
  const info = await getSaleInformation(db, {
    salesId: data.meta.salesId,
  });
  const response = await db.$transaction(
    async (tx) => {
      return await packDispatchItemsAction(tx as any, {
        data: info,
        authorId: data.meta.authorId!,
        packItems: data.packItems,
        authorName: data.meta.authorName,
        update: true,
      });
    },
    {
      maxWait: 30 * 1000,
    }
  );
}
export async function resetSalesTask(db: Db, salesId) {
  const response = await db.$transaction(
    async (tx) => {
      await updateSalesItemControlAction(tx as any, salesId);
      await updateSalesStatControlAction(tx as any, salesId);
    },
    {
      maxWait: 30 * 1000,
    }
  );
}
