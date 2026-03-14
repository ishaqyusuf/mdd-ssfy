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
import { hasQty } from "@gnd/utils/sales";
import { RenturnTypeAsync } from "@gnd/utils";
export async function submitAllTask(db: Db, data: UpdateSalesControl) {
  const submitArgs = data.submitAll;
  const info = await getSaleInformation(db, {
    salesId: data.meta.salesId,
  });
  const resp = await db.$transaction(
    async (tx) => {
      const resp = await submitAssignmentsAction(tx as any, {
        authorId: data.meta.authorId,
        data: info,
        ...submitArgs,
      });
      await resetSalesAction(tx as any, data.meta.salesId!);
      return resp;
    },
    {
      maxWait: 30 * 1000,
    },
  );
  return resp;
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
        recomposeQty(item.analytics.assignment.pending),
      );

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
        updateStats: false,
      });
      await resetSalesAction(tx as any, data.meta.salesId);
    },
    {
      maxWait: 30 * 1000,
    },
  );
}
export async function submitNonProductionsTask(
  db: Db,
  data: UpdateSalesControl,
) {
  const info = await getSaleInformation(db, {
    salesId: data.meta.salesId,
  });
  const response = await db.$transaction(
    async (tx) => {
      const resp = await submitNonProductionsAction(tx as any, {
        data: info,
        authorId: data.meta.authorId,
      });
      await resetSalesAction(tx as any, data.meta.salesId);
      return resp;
    },
    {
      maxWait: 30 * 1000,
    },
  );
  return {
    info,
    response,
  };
}
export async function clearPackingTask(db: Db, data: UpdateSalesControl) {
  const clearData = data.clearPackings;
  await db.$transaction(async (tx) => {
    await tx.orderItemDelivery.updateMany({
      where: {
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
    await resetSalesAction(tx as any, data.meta.salesId);
  });
}
export async function deletePackingItem(db: Db, data: DeletePackingSchema) {
  await db.$transaction(async (tx) => {
    await tx.orderItemDelivery.updateMany({
      where: {
        id: !data.packingUid ? data.packingId! : undefined,
        packingUid: data.packingUid ? data.packingUid : undefined,
      },
      data: {
        packingStatus: "unpacked" as DispatchItemPackingStatus,
        packedBy: data.deleteBy,
      },
    });
    await resetSalesAction(tx as any, data.salesId);
  });
}
export async function cancelDispatchTask(db: Db, data: UpdateSalesControl) {
  await db.$transaction(async (tx) => {
    await tx.orderDelivery.update({
      where: {
        id: data.cancelDispatch?.dispatchId!,
      },
      data: {
        status: "cancelled" as SalesDispatchStatus,
      },
    });
    await resetSalesAction(tx as any, data.meta.salesId);
  });
}
export async function startDispatchTask(db: Db, data: UpdateSalesControl) {
  await db.$transaction(async (tx) => {
    await tx.orderDelivery.update({
      where: {
        id: data.startDispatch?.dispatchId!,
      },
      data: {
        status: "in progress" as SalesDispatchStatus,
      },
    });
    await resetSalesAction(tx as any, data.meta.salesId);
  });
}
export async function submitDispatchTask(db: Db, data: UpdateSalesControl) {
  const task = data.submitDispatch!;
  const attachmentTags = (task?.attachments ?? [])
    .filter((a) => a.pathname)
    .map((a) => noteTag("attachment", a.pathname));
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
          ...attachmentTags,
        ],
      };
      await saveNote(tx, note, data.meta.authorId);
    },
    {
      maxWait: 30 * 1000,
    },
  );
  return response;
}

export function buildAutoPackingLines(
  info: RenturnTypeAsync<typeof getSaleInformation>,
): NonNullable<NonNullable<UpdateSalesControl["packItems"]>["packingLines"]> {
  const packingLines: NonNullable<
    NonNullable<UpdateSalesControl["packItems"]>["packingLines"]
  > = [];

  for (const item of info.items) {
    if (!item.itemId) continue;

    const deliverables = (item.deliverables ?? []).filter((d) => hasQty(d.qty));

    if (!deliverables.length) continue;
    for (const deliverable of deliverables) {
      packingLines.push({
        salesItemId: item.itemId,
        submissionId: deliverable.submissionId,
        qty: deliverable.qty,
      });
    }
  }

  return packingLines;
}

function buildSelectionPackingLinesFromRequestedItems(
  info: RenturnTypeAsync<typeof getSaleInformation>,
  requestedItems: NonNullable<
    NonNullable<UpdateSalesControl["packItems"]>["requestedItems"]
  >,
) {
  const packingLines: NonNullable<
    NonNullable<UpdateSalesControl["packItems"]>["packingLines"]
  > = [];
  const insufficient: string[] = [];

  for (const request of requestedItems) {
    const enteredQty = recomposeQty(request.qty as any);
    if (!hasQty(enteredQty)) continue;

    const matchedItem =
      (request.itemUid
        ? info.items.find((item) => item.controlUid === request.itemUid)
        : null) ||
      info.items.find((item) => item.itemId === request.salesItemId);

    if (!matchedItem) {
      insufficient.push(request.title || `Item #${request.salesItemId}`);
      continue;
    }

    let pending = recomposeQty(enteredQty as any);
    const deliverables = (matchedItem.deliverables || []).filter((deliverable) =>
      hasQty(deliverable.qty as any),
    );

    for (const deliverable of deliverables) {
      if (!hasQty(pending)) break;
      const picked = pickQtyFrom(
        recomposeQty(pending as any),
        recomposeQty(deliverable.qty as any),
      );
      if (!hasQty(picked?.picked)) continue;
      packingLines.push({
        salesItemId: Number(request.salesItemId),
        submissionId: Number(deliverable.submissionId),
        qty: recomposeQty(picked.picked as any),
        note: request.note,
      });
      pending = recomposeQty(picked.pendingPick as any);
    }

    if (hasQty(pending)) {
      insufficient.push(request.title || matchedItem.title || "Item");
    }
  }

  return {
    packingLines,
    insufficient,
  };
}

export async function packDispatchItemTask(db: Db, data: UpdateSalesControl) {
  const packMode = data.packItems?.packMode!;
  const requestedDispatchStatus = data.packItems?.dispatchStatus;
  if (packMode == "all") {
    const assignmentInfo = await getSaleInformation(db, {
      salesId: data.meta.salesId,
    });
    const createAssignments: CreateSalesAssignmentProps["items"] =
      assignmentInfo.items
        .filter(
          (item) =>
            !!item.itemId && hasQty(item.analytics?.assignment?.pending),
        )
        .map((item) => ({
          itemInfo: item,
          qty: item.analytics!.assignment.pending,
        }));

    if (createAssignments.length) {
      await db.$transaction(
        async (tx) => {
          await createSalesAssignmentAction(tx as any, {
            items: createAssignments,
            salesId: data.meta.salesId,
            authorId: data.meta.authorId,
            updateStats: true,
          });
        },
        {
          maxWait: 30 * 1000,
        },
      );
    }
  }
  if (packMode == "all" || packMode == "available")
    await submitAllTask(db, {
      meta: data.meta,
      submitAll: {},
    });
  const info = await getSaleInformation(db, {
    salesId: data.meta.salesId,
  });
  if (
    data.packItems?.packMode === "selection" &&
    (data.packItems?.requestedItems?.length || 0) > 0
  ) {
    let built = buildSelectionPackingLinesFromRequestedItems(
      info,
      data.packItems!.requestedItems!,
    );

    if (built.insufficient.length) {
      await submitNonProductionsTask(db, {
        meta: data.meta,
      } as UpdateSalesControl);
      const refreshed = await getSaleInformation(db, {
        salesId: data.meta.salesId,
      });
      built = buildSelectionPackingLinesFromRequestedItems(
        refreshed,
        data.packItems!.requestedItems!,
      );
      if (built.insufficient.length) {
        throw new Error(
          `Insufficient deliverables for: ${built.insufficient
            .slice(0, 3)
            .join(", ")}${built.insufficient.length > 3 ? "..." : ""}`,
        );
      }
    }
    data.packItems!.packingLines = built.packingLines;
  }
  if (data.packItems?.packMode !== "selection") {
    data.packItems!.packingLines = buildAutoPackingLines(info);
  }
  const response = await db.$transaction(
    async (tx) => {
      if (data.packItems?.replaceExisting) {
        await tx.orderItemDelivery.updateMany({
          where: {
            orderDeliveryId: data.packItems.dispatchId,
            packingStatus: {
              not: "unpacked",
            },
          },
          data: {
            packingStatus: "unpacked" as DispatchItemPackingStatus,
            unpackedBy: data.meta.authorName,
          },
        });
      }
      const resp = await packDispatchItemsAction(tx as any, {
        data: info,
        authorId: data.meta.authorId!,
        packItems: data.packItems,
        authorName: data.meta.authorName,
        update: true,
      });
      if (
        requestedDispatchStatus &&
        ["queue", "missing items"].includes(requestedDispatchStatus as string) &&
        (resp.created > 0 || resp.skipped > 0)
      ) {
        await tx.orderDelivery.update({
          where: {
            id: data.packItems!.dispatchId,
          },
          data: {
            status: "packed" as SalesDispatchStatus,
          },
        });
      }
      await resetSalesAction(tx as any, data.meta.salesId);
      return resp;
    },
    {
      maxWait: 30 * 1000,
    },
  );
  return response;
}
export async function resetSalesTask(db: Db, salesId) {
  const response = await db.$transaction(
    async (tx) => {
      await resetSalesAction(tx as any, salesId);
    },
    {
      maxWait: 30 * 1000,
    },
  );
}
export async function deleteSubmissionsTask(db: Db, data: UpdateSalesControl) {
  await db.$transaction(async (tx) => {
    const args = data.deleteSubmissions!;
    if (args.submissionIds?.length)
      await tx.orderProductionSubmissions.updateMany({
        where: {
          id: {
            in: args.submissionIds,
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });
    if (args.itemIds?.length)
      await tx.orderProductionSubmissions.updateMany({
        where: {
          salesOrderItemId: {
            in: args.itemIds,
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });
    if (args.itemControlUids?.length)
      await tx.orderProductionSubmissions.updateMany({
        where: {
          assignment: {
            salesItemControlUid: {
              in: args.itemControlUids,
            },
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });
    if (args.allBySalesId)
      await tx.orderProductionSubmissions.updateMany({
        where: {
          salesOrderId: args.allBySalesId,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    await resetSalesAction(tx as any, data.meta.salesId);
  });
}
export async function deleteAssignmentsTasks(db: Db, data: UpdateSalesControl) {
  await db.$transaction(async (tx) => {
    const args = data.deleteAssignments!;
    if (args.assignmentIds?.length)
      await tx.orderItemProductionAssignments.updateMany({
        where: {
          id: {
            in: args.assignmentIds,
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });
    if (args.itemIds?.length)
      await tx.orderItemProductionAssignments.updateMany({
        where: {
          itemId: {
            in: args.itemIds,
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });
    if (args.itemControlUids?.length)
      await tx.orderItemProductionAssignments.updateMany({
        where: {
          salesItemControlUid: {
            in: args.itemControlUids,
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });
    if (args.allBySalesId)
      await tx.orderItemProductionAssignments.updateMany({
        where: {
          orderId: args.allBySalesId,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    await resetSalesAction(tx as any, data.meta.salesId);
  });
}

export async function markAsCompletedTask(db: Db, args: UpdateSalesControl) {
  await submitAllTask(db, {
    meta: args.meta,
    submitAll: {},
  });
  await packDispatchItemTask(db, {
    meta: args.meta,
    packItems: {
      dispatchId: args.markAsCompleted?.dispatchId!,
      packMode: "all",
      dispatchStatus: "completed",
      replaceExisting: true,
    },
  });
  await submitDispatchTask(db, {
    meta: args.meta,
    submitDispatch: args.markAsCompleted,
  });
}
