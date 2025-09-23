import {
  generateRandomString,
  lastId,
  RenturnTypeAsync,
  sum,
} from "@gnd/utils";
import { Db, DispatchItemPackingStatus, Qty, SalesInfoItem } from "../types";
import { Prisma } from "@prisma/client";
import { updateSalesItemStats } from "./update-sales-item-stat";
import { updateSalesStatAction } from "./update-sales-stat";
import { hasQty } from "@gnd/utils/sales";
import { getSaleInformation } from "./get-sale-information";
import { z } from "zod";
import { updateSalesControlSchema } from "../schema";
import { getDispatchControlType } from "../utils/utils";
import { qtyMatrixDifference, recomposeQty } from "../utils/sales-control";
import { updateSalesItemControlAction, updateSalesStatControlAction } from ".";
import { NoteTagNames } from "@gnd/utils/constants";
import { transformNote } from "@gnd/utils/note";

export interface CreateSalesAssignmentProps {
  submit?: boolean;
  salesId: number;
  assignedToId?: number;
  authorId: number;
  updateStats?: boolean;
  dueDate?;
  items: {
    itemInfo: SalesInfoItem;
    qty: Qty;
  }[];
}
export async function createSalesAssignmentAction(
  db: Db,
  args: CreateSalesAssignmentProps
) {
  const lastAssignmentId = await lastId(db.orderItemProductionAssignments);
  await db.orderItemProductionAssignments.createMany({
    data: args.items.map(
      (item) =>
        ({
          laborCost: item.itemInfo.unitLabor,
          shelfItemId: item.itemInfo.shelfId || undefined,
          salesDoorId: item.itemInfo.doorId || undefined,
          orderId: args.salesId,
          lhQty: item.qty.lh,
          rhQty: item.qty.rh,
          qtyAssigned: item.qty.qty || sum([item.qty.lh, item.qty.rh]),
          assignedToId: args.assignedToId || undefined,
          dueDate: args.dueDate,
          assignedById: args.authorId,
          itemId: item.itemInfo.itemId!,
          salesItemControlUid: item.itemInfo.controlUid,
        }) satisfies Prisma.OrderItemProductionAssignmentsCreateManyInput
    ),
  });
  if (args.updateStats) {
    await Promise.all(
      args.items.map(async (item) => {
        await updateSalesItemStats(
          {
            uid: item.itemInfo.controlUid,
            salesId: args.salesId,
            type: "prodAssigned",
            itemTotal: item.itemInfo.analytics?.stats?.qty?.qty,
            qty: {
              ...item.qty,
            },
          },
          db
        );
      })
    );
    await updateSalesStatAction(
      {
        salesId: args.salesId,
        types: ["prodAssigned"],
      },
      db
    );
  }
  if (args.submit) {
    const assignments = await db.orderItemProductionAssignments.findMany({
      where: {
        id: {
          gt: lastAssignmentId,
        },
        orderId: args.salesId,
      },
      select: {
        id: true,
        salesItemControlUid: true,
      },
    });
    await createSalesAssignmentSubmissionAction(db, {
      authorId: args.authorId,
      updateStats: args.updateStats,
      salesId: args.salesId,
      items: args.items.map((data) => ({
        assignmentId: assignments.find(
          (a) => a.salesItemControlUid === data.itemInfo.controlUid
        )!?.id,
        itemInfo: data.itemInfo,
        qty: data.qty,
      })),
    });
  }
}
export interface CreateSalesAssignmentSubmissionProps {
  salesId: number;
  authorId: number;
  updateStats?: boolean;
  items: {
    itemInfo: SalesInfoItem;
    assignmentId: number;
    qty: Qty;
  }[];
}
export async function createSalesAssignmentSubmissionAction(
  db: Db,
  args: CreateSalesAssignmentSubmissionProps
) {
  await db.orderProductionSubmissions.createMany({
    data: args.items.map(
      (item) =>
        ({
          // laborCost: item.itemInfo.unitLabor,
          // shelfItemId: item.itemInfo.shelfId || undefined,
          // salesOrderId: item.itemInfo.doorId || undefined,
          salesOrderId: args.salesId,
          lhQty: item.qty.lh,
          rhQty: item.qty.rh,
          qty: item.qty.qty || sum([item.qty.lh, item.qty.rh]),
          // assignedToId: args.assignedToId || undefined,
          // dueDate: args.dueDate,
          submittedById: args.authorId,
          salesOrderItemId: item.itemInfo.itemId!,
          // salesItemControlUid: item.itemInfo.controlUid,
          meta: {},
          assignmentId: item.assignmentId,
        }) satisfies Prisma.OrderProductionSubmissionsCreateManyInput
    ),
  });
  if (args.updateStats) {
    await Promise.all(
      args.items.map(async (item) => {
        await updateSalesItemStats(
          {
            uid: item.itemInfo.controlUid,
            salesId: args.salesId,
            type: "prodCompleted",
            itemTotal: item.itemInfo.analytics?.stats?.qty?.qty,
            qty: {
              ...item.qty,
            },
          },
          db
        );
      })
    );
    await updateSalesStatAction(
      {
        salesId: args.salesId,
        types: ["prodCompleted"],
      },
      db
    );
  }
}

export async function getDispatchCompletetionNotes(db: Db, dispatchId) {
  const note = await db.notePad.findFirst({
    where: {
      deletedAt: null,
      AND: [
        {
          tags: {
            some: {
              tagName: "deliveryId" as NoteTagNames,
              tagValue: String(dispatchId),
            },
          },
        },
        {
          OR: [
            {
              tags: {
                some: { tagName: "dispatchRecipient" as NoteTagNames },
              },
            },
            {
              tags: {
                some: { tagName: "signature" as NoteTagNames },
              },
            },
          ],
        },
      ],
    },
    include: {
      tags: true,
    },
  });
  if (!note) return null;
  return transformNote(note);
}
export async function packDispatchItemsAction(
  db: Db,
  props: PackDispatchItemsAction
) {
  const { data } = props;
  await db.orderItemDelivery.createMany({
    data: props
      .packItems!.packingList!.map((pi) => {
        const packingUid = generateRandomString(4);
        return pi.submissions.map(
          (ps) =>
            ({
              orderId: data.order.id,
              orderItemId: pi.salesItemId,
              lhQty: ps.qty.lh,
              rhQty: ps.qty.rh,
              note: pi.note,
              packingUid,
              status: props.packItems!.dispatchStatus,
              qty: ps.qty.qty || sum([ps.qty.rh, ps.qty.lh]),
              meta: {},
              orderDeliveryId: props.packItems!.dispatchId,
              orderProductionSubmissionId: ps.submissionId,
              packedBy: props.authorName,
              packingStatus: "packed" as DispatchItemPackingStatus,
            }) satisfies Prisma.OrderItemDeliveryCreateManyInput
        );
      })
      .flat(),
  });
  if (props.update)
    await updateSalesStatAction(
      {
        salesId: data?.order.id,
        types: [getDispatchControlType(props.packItems!.dispatchStatus as any)],
      },
      db
    );
}

export async function resetSalesAction(db: Db, salesId) {
  await updateSalesItemControlAction(db, salesId);
  await updateSalesStatControlAction(db, salesId);
}
type SubmitAll = z.infer<typeof updateSalesControlSchema>["submitAll"];
type SubmitAssingmentsAction = {
  data: RenturnTypeAsync<typeof getSaleInformation>;
  authorId;
} & SubmitAll;
export async function submitAssignmentsAction(
  db: Db,
  props: SubmitAssingmentsAction
) {
  const { assignedToId, authorId, data } = props;
  const createSubmissions: CreateSalesAssignmentSubmissionProps["items"] = [];
  const createAssignments: CreateSalesAssignmentProps["items"] = [];
  const submitAll = !props.selections?.length && !props.itemUids?.length;
  for (const item of props.data.items) {
    // if (item.itemConfig?.production) continue;
    const pendingProds = item.analytics?.assignment.pending!;
    if (
      hasQty(pendingProds) &&
      (submitAll || props.itemUids?.includes(item?.controlUid))
    )
      createAssignments.push({
        itemInfo: item,
        qty: pendingProds,
      });
    for (const s of item.analytics?.pendingSubmissions!) {
      if (
        hasQty(s.qty) &&
        (submitAll ||
          props.itemUids?.includes(item.controlUid) ||
          props.selections?.some((a) => a.assignmentId === s.assignmentId))
      ) {
        createSubmissions.push({
          itemInfo: item,
          qty: s.qty,
          assignmentId: s.assignmentId,
        });
      }
    }
  }
  await createSalesAssignmentAction(db, {
    items: createAssignments,
    submit: true,
    authorId: authorId,
    salesId: data.order.id,
    assignedToId: assignedToId!,
  });
  await createSalesAssignmentSubmissionAction(db, {
    authorId,
    salesId: data.order.id,
    items: createSubmissions,
  });
}
interface SubmitNonProductionsAction {
  data: RenturnTypeAsync<typeof getSaleInformation>;
  authorId;
}

export async function submitNonProductionsAction(
  db: Db,
  { data, authorId }: SubmitNonProductionsAction
) {
  const createAssignments: CreateSalesAssignmentProps["items"] = [];
  const createSubmissions: CreateSalesAssignmentSubmissionProps["items"] = [];
  for (const item of data.items) {
    if (!!item.itemConfig?.production) {
      continue;
    }
    const pendingProds = recomposeQty(
      qtyMatrixDifference(
        item.analytics?.stats.qty!,
        item.analytics?.stats.prodAssigned!
      )
    );

    console.log(
      `${item.title} - ${item.itemConfig?.production} : ${pendingProds.qty}`
    );
    // const pendingProds = item.analytics?.production!;
    const deliverables = item.deliverables;

    if (hasQty(pendingProds))
      createAssignments.push({
        itemInfo: item,
        qty: pendingProds,
      });

    for (const s of item.analytics?.pendingSubmissions!) {
      if (hasQty(s.qty)) {
        createSubmissions.push({
          itemInfo: item,
          qty: s.qty,
          assignmentId: s.assignmentId,
        });
      }
    }
  }
  console.log(`Assignments created: ${createAssignments.length}`);
  console.log(`Submissions created: ${createSubmissions.length}`);
  await createSalesAssignmentAction(db, {
    items: createAssignments,
    submit: true,
    authorId: authorId,
    salesId: data.order.id,
  });
  await createSalesAssignmentSubmissionAction(db, {
    authorId,
    salesId: data.order.id,
    items: createSubmissions,
  });
  return {
    assignmentsCreated: createAssignments?.length,
    submissionsCreated: createSubmissions.length,
    updated: !!createAssignments.length || createSubmissions?.length,
  };
}

type PackDispatch = z.infer<typeof updateSalesControlSchema>["packItems"];
type PackDispatchItemsAction = {
  data: RenturnTypeAsync<typeof getSaleInformation>;
  authorId;
  packItems: PackDispatch;
  update?: boolean;
  authorName: string;
};
