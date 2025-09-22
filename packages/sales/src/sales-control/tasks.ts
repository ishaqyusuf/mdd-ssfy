import { NoteTagTypes } from "@gnd/utils/constants";
import { updateSalesItemControlAction, updateSalesStatControlAction } from ".";
import { DeletePackingSchema, UpdateSalesControl } from "../schema";
import { Db, DispatchItemPackingStatus, SalesDispatchStatus } from "../types";
import {
  submitNonProductionsAction,
  submitAssignmentsAction,
  packDispatchItemsAction,
  resetSalesAction,
  createSalesAssignmentAction,
  CreateSalesAssignmentProps,
} from "./actions";
import { getSaleInformation } from "./get-sale-information";
import { noteTag, saveNote, SaveNoteSchema } from "@gnd/utils/note";
import { pickQtyFrom, recomposeQty } from "../utils/sales-control";
import { consoleLog } from "@gnd/utils";
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
export async function createAssignmentsTask(db: Db, data: UpdateSalesControl) {
  const payload = data.createAssignments;
  const info = await getSaleInformation(db, {
    salesId: data.meta.salesId,
  });

  const createAssignments: CreateSalesAssignmentProps["items"] = [];
  for (const item of info.items) {
    const s = payload?.selections?.find((s) => s.uid === item.controlUid);
    if (s) {
      const { pendingPick, picked, remainder } = pickQtyFrom(
        recomposeQty(s.qty as any),
        recomposeQty(item.analytics.assignment.pending)
      );
      consoleLog("Job Error", {
        pendingPick,
        picked,
        remainder,
        item,
      });
      if (picked) {
        // picked.lh
        createAssignments.push({
          itemInfo: item,
          qty: picked,
        });
      }
    }
  }
  if (createAssignments.length != payload?.selections?.length) {
    if (!payload?.retries) {
      consoleLog("RETRYING>>>>>");
      await resetSalesAction(db, data.meta.salesId);
      return createAssignmentsTask(db, {
        ...data,
        createAssignments: {
          ...payload,
          retries: 1,
        },
      });
    }
  }
  if (!createAssignments.length) {
    consoleLog("Job Error", {
      payload,
    });
    throw new Error("Unable to complete, nothing to submit!");
  }
  await db.$transaction(
    async (tx) => {
      await createSalesAssignmentAction(tx as any, {
        items: createAssignments,
        salesId: data.meta.salesId,
        assignedToId: payload?.assignedToId!,
        authorId: data.meta.authorId,
        dueDate: payload?.dueDate,
        updateStats: true,
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
export async function clearPackingTask(db: Db, data: UpdateSalesControl) {
  const clearData = data.clearPackings;
  await db.orderItemDelivery.updateMany({
    where: {
      // id: !data.packingUid ? data.packingId! : undefined,
      // packingUid: data.packingUid ? data.packingUid : undefined,
      orderId: !clearData?.dispatchId ? data.meta.salesId : undefined,
      orderDeliveryId: !clearData?.dispatchId
        ? undefined
        : clearData?.dispatchId,
      packingStatus: {
        not: "unpacked",
      },
    },
    data: {
      packingStatus: "unpacked" as DispatchItemPackingStatus,
      unpackedBy: data.meta.authorName,
    },
  });
  await resetSalesTask(db, data.meta.salesId);
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
export async function cancelDispatchTask(db: Db, data: UpdateSalesControl) {
  await db.orderDelivery.update({
    where: {
      id: data.cancelDispatch?.dispatchId!,
    },
    data: {
      status: "cancelled" as SalesDispatchStatus,
    },
  });
  await resetSalesTask(db, data.meta.salesId);
}
export async function startDispatchTask(db: Db, data: UpdateSalesControl) {
  await db.orderDelivery.update({
    where: {
      id: data.startDispatch?.dispatchId!,
    },
    data: {
      status: "in progress" as SalesDispatchStatus,
    },
  });
  await resetSalesTask(db, data.meta.salesId);
}
export async function submitDispatchTask(db: Db, data: UpdateSalesControl) {
  const task = data.submitDispatch!;
  const response = await db.$transaction(
    async (tx) => {
      await tx.orderDelivery.update({
        where: {
          id: task?.dispatchId!,
        },
        data: {
          status: "completed" as SalesDispatchStatus,
        },
      });
      // await resetSalesTask(tx as any, data.meta.salesId);
      const salesId = data.meta.salesId;
      await resetSalesAction(tx as any, salesId);
      const note: SaveNoteSchema = {
        headline: data.meta.authorName,
        subject: `Sales Dispatch Completed`,
        note: task?.note!,
        tags: [
          noteTag("signature", task.signature),
          noteTag("dispatchRecipient", task.receivedBy),
          noteTag("salesId", data.meta.salesId),
          noteTag("deliveryId", task.dispatchId),
          noteTag("type", "dispatch" as NoteTagTypes),
          ...task
            ?.attachments!?.filter((a) => a.pathname)
            ?.map((a) => noteTag("attachment", a.pathname)),
        ],
      };
      await saveNote(tx, note, data.meta.authorId);
    },
    {
      maxWait: 30 * 1000,
    }
  );
  return response;
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
      await resetSalesAction(tx as any, salesId);
    },
    {
      maxWait: 30 * 1000,
    }
  );
}
