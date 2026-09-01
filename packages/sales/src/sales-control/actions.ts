import type { Prisma } from "@gnd/db";
import {
  type RenturnTypeAsync,
  generateRandomString,
  lastId,
  sum,
} from "@gnd/utils";
import type { NoteTagNames } from "@gnd/utils/constants";
import { transformNote } from "@gnd/utils/note";
import { hasQty } from "@gnd/utils/sales";
import type { z } from "zod";
import { updateSalesItemControlAction, updateSalesStatControlAction } from ".";
import type { updateSalesControlSchema } from "../schema";
import type {
  Db,
  DispatchItemPackingStatus,
  Qty,
  SalesInfoItem,
} from "../types";
import {
  qtyMatrixDifference,
  recomposeQty,
  transformQtyHandle,
} from "../utils/sales-control";
import { getDispatchControlType } from "../utils/utils";
import type { getSaleInformation } from "./get-sale-information";
import { updateSalesItemStats } from "./update-sales-item-stat";
import { updateSalesStatAction } from "./update-sales-stat";

export interface CreateSalesAssignmentProps {
  submit?: boolean;
  materialReviewId?: number | null;
  submissionMeta?: Prisma.InputJsonObject;
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
  args: CreateSalesAssignmentProps,
) {
  if (!args.items.length) return null;
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
          assignedAt: args.assignedToId ? new Date() : null,
          dueDate: args.dueDate,
          assignedById: args.authorId,
          itemId: item.itemInfo.itemId!,
          salesItemControlUid: item.itemInfo.controlUid,
        }) satisfies Prisma.OrderItemProductionAssignmentsCreateManyInput,
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
          db,
        );
      }),
    );
    await updateSalesStatAction(
      {
        salesId: args.salesId,
        types: ["prodAssigned"],
      },
      db,
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
      materialReviewId: args.materialReviewId,
      submissionMeta: args.submissionMeta,
      items: args.items.map((data) => {
        const assignmentId = assignments.find(
          (a) => a.salesItemControlUid === data.itemInfo.controlUid,
        )?.id;
        if (!assignmentId) {
          throw new Error(
            `Production assignment was not created for sales item ${data.itemInfo.controlUid}.`,
          );
        }
        return {
          assignmentId,
          itemInfo: data.itemInfo,
          qty: data.qty,
        };
      }),
    });
  }
}
export interface CreateSalesAssignmentSubmissionProps {
  salesId: number;
  authorId: number;
  materialReviewId?: number | null;
  submissionMeta?: Prisma.InputJsonObject;
  updateStats?: boolean;
  items: {
    itemInfo: SalesInfoItem;
    assignmentId: number;
    qty: Qty;
  }[];
}
export async function createSalesAssignmentSubmissionAction(
  db: Db,
  args: CreateSalesAssignmentSubmissionProps,
) {
  if (!args.items.length) return null;
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
          materialReviewId: args.materialReviewId ?? undefined,
          salesOrderItemId: item.itemInfo.itemId!,
          // salesItemControlUid: item.itemInfo.controlUid,
          meta: args.submissionMeta ?? {},
          assignmentId: item.assignmentId,
        }) satisfies Prisma.OrderProductionSubmissionsCreateManyInput,
    ),
    skipDuplicates: Boolean(args.materialReviewId),
  });
  if (args.updateStats && !args.materialReviewId) {
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
          db,
        );
      }),
    );
    await updateSalesStatAction(
      {
        salesId: args.salesId,
        types: ["prodCompleted"],
      },
      db,
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
    orderBy: {
      createdAt: "desc",
    },
    include: {
      tags: true,
    },
  });
  if (!note) return null;
  return transformNote(note);
}

export async function getDispatchCompletedActivity(db: Db, dispatchId: number) {
  const note = await db.notePad.findFirst({
    where: {
      deletedAt: null,
      AND: [
        {
          tags: {
            some: {
              tagName: "channel" as NoteTagNames,
              tagValue: "sales_dispatch_completed",
            },
          },
        },
        {
          tags: {
            some: {
              tagName: "dispatchId" as NoteTagNames,
              tagValue: String(dispatchId),
            },
          },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
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
  props: PackDispatchItemsAction,
) {
  const { data } = props;
  const packingLines = props.packItems?.packingLines?.length
    ? props.packItems.packingLines
    : (props.packItems?.packingList ?? []).flatMap((item) =>
        item.submissions.map((submission) => ({
          salesItemId: item.salesItemId,
          submissionId: submission.submissionId,
          qty: submission.qty,
          note: item.note,
        })),
      );

  if (!packingLines.length) return { created: 0, skipped: 0 };

  const dispatchId = props.packItems!.dispatchId;
  const submissionIds = packingLines
    .map((line) => line.submissionId)
    .filter(Boolean);
  const uniqueSubmissionIds = Array.from(new Set(submissionIds));
  let approvedPackingReport: {
    salesOrderItemId: number;
    orderProductionSubmissionId: number | null;
    qty: number;
    lhQty: number;
    rhQty: number;
  } | null = null;
  if (uniqueSubmissionIds.length) {
    let approvedPackingSubmissionId: number | null = null;
    if (props.approvedPackingReportId) {
      const report = await db.salesPackingReport.findFirst({
        where: {
          id: props.approvedPackingReportId,
          status: "APPROVED",
          reviewedById: props.authorId,
          orderDeliveryId: dispatchId,
          salesOrderId: data.order.id,
        },
        select: {
          salesOrderItemId: true,
          orderProductionSubmissionId: true,
          qty: true,
          lhQty: true,
          rhQty: true,
        },
      });
      const reportLine = packingLines[0];
      if (
        !report ||
        !reportLine ||
        packingLines.some(
          (line) => line.salesItemId !== report.salesOrderItemId,
        ) ||
        (report.orderProductionSubmissionId !== null &&
          (packingLines.length !== 1 ||
            reportLine.submissionId !== report.orderProductionSubmissionId))
      ) {
        throw new Error(
          "Approved packing report does not authorize this packing command.",
        );
      }
      approvedPackingReport = report;
      approvedPackingSubmissionId = report.orderProductionSubmissionId;
    }
    const [normallyEligibleSubmissions, approvedGuardedReports] =
      await Promise.all([
        db.orderProductionSubmissions.findMany({
          where: {
            id: { in: uniqueSubmissionIds },
            salesOrderId: data.order.id,
            deletedAt: null,
            OR: [
              { materialReviewId: null },
              {
                materialReview: {
                  status: "APPROVED",
                },
              },
            ],
          },
          select: { id: true },
        }),
        db.salesPackingReport.findMany({
          where: {
            orderDeliveryId: dispatchId,
            salesOrderId: data.order.id,
            orderProductionSubmissionId: { in: uniqueSubmissionIds },
            status: "APPROVED",
          },
          select: {
            orderProductionSubmissionId: true,
            qty: true,
            lhQty: true,
            rhQty: true,
          },
        }),
      ]);
    const normallyEligibleIds = new Set(
      normallyEligibleSubmissions.map((submission) => submission.id),
    );
    const approvedGuardedBySubmission = new Map<
      number,
      { qty: number; lh: number; rh: number }
    >();
    for (const report of approvedGuardedReports) {
      if (!report.orderProductionSubmissionId) continue;
      const normalizedReportQty = recomposeQty({
        qty: report.qty,
        lh: report.lhQty,
        rh: report.rhQty,
      } as any);
      const current = approvedGuardedBySubmission.get(
        report.orderProductionSubmissionId,
      ) || { qty: 0, lh: 0, rh: 0 };
      approvedGuardedBySubmission.set(report.orderProductionSubmissionId, {
        qty: sum([current.qty, normalizedReportQty.qty]),
        lh: sum([current.lh, normalizedReportQty.lh]),
        rh: sum([current.rh, normalizedReportQty.rh]),
      });
    }
    const eligibleSubmissionIds = new Set([
      ...normallyEligibleIds,
      ...approvedGuardedBySubmission.keys(),
      ...(approvedPackingSubmissionId ? [approvedPackingSubmissionId] : []),
    ]);
    if (eligibleSubmissionIds.size !== uniqueSubmissionIds.length) {
      throw new Error(
        "A production submission is awaiting material review and cannot be packed.",
      );
    }
    for (const line of packingLines) {
      if (normallyEligibleIds.has(line.submissionId)) continue;
      const authorized = approvedGuardedBySubmission.get(line.submissionId);
      const requested = recomposeQty(line.qty as any);
      if (
        !authorized ||
        Number(requested.qty || 0) > authorized.qty ||
        Number(requested.lh || 0) > authorized.lh ||
        Number(requested.rh || 0) > authorized.rh
      ) {
        throw new Error(
          "Approved guarded packing does not authorize the requested quantity.",
        );
      }
    }
  }

  const existingPacked = submissionIds.length
    ? await db.orderItemDelivery.findMany({
        where: {
          orderDeliveryId: dispatchId,
          deletedAt: null,
          packingStatus: "packed" as DispatchItemPackingStatus,
          orderProductionSubmissionId: { in: submissionIds },
        },
        select: {
          orderProductionSubmissionId: true,
          qty: true,
          lhQty: true,
          rhQty: true,
        },
      })
    : [];

  const packedBySubmission = new Map<
    number,
    { lh: number; rh: number; qty: number }
  >();
  for (const row of existingPacked) {
    const submissionId = row.orderProductionSubmissionId;
    if (!submissionId) continue;
    const current = packedBySubmission.get(submissionId) || {
      lh: 0,
      rh: 0,
      qty: 0,
    };
    packedBySubmission.set(submissionId, {
      lh: sum([current.lh, row.lhQty]),
      rh: sum([current.rh, row.rhQty]),
      qty: sum([current.qty, row.qty]),
    });
  }

  if (approvedPackingReport) {
    const authorized = recomposeQty(transformQtyHandle(approvedPackingReport));
    const requestedDelta = packingLines.reduce(
      (total, reportLine) => {
        const requested = recomposeQty(reportLine.qty as any);
        const existing = packedBySubmission.get(reportLine.submissionId) || {
          lh: 0,
          rh: 0,
          qty: 0,
        };
        return {
          qty:
            total.qty + Math.max(0, Number(requested.qty || 0) - existing.qty),
          lh: total.lh + Math.max(0, Number(requested.lh || 0) - existing.lh),
          rh: total.rh + Math.max(0, Number(requested.rh || 0) - existing.rh),
        };
      },
      { qty: 0, lh: 0, rh: 0 },
    );
    if (
      requestedDelta.qty !== authorized.qty ||
      requestedDelta.lh !== authorized.lh ||
      requestedDelta.rh !== authorized.rh
    ) {
      throw new Error(
        "Approved packing report does not authorize this packing command.",
      );
    }
  }

  const createRows: Prisma.OrderItemDeliveryCreateManyInput[] = [];
  let skipped = 0;
  for (const line of packingLines) {
    const existing = packedBySubmission.get(line.submissionId) || {
      lh: 0,
      rh: 0,
      qty: 0,
    };
    const requested = recomposeQty(line.qty as any);
    const remaining = recomposeQty(
      qtyMatrixDifference(requested, {
        lh: existing.lh,
        rh: existing.rh,
        qty: existing.qty,
      } as any),
    );
    if (!hasQty(remaining)) {
      skipped += 1;
      continue;
    }

    createRows.push({
      orderId: data.order.id,
      orderItemId: line.salesItemId,
      lhQty: remaining.lh,
      rhQty: remaining.rh,
      note: line.note,
      packingUid: generateRandomString(4),
      status: props.packItems!.dispatchStatus,
      qty: remaining.qty || sum([remaining.rh, remaining.lh]),
      meta: {},
      orderDeliveryId: dispatchId,
      orderProductionSubmissionId: line.submissionId,
      packedBy: props.authorName,
      packingStatus: "packed" as DispatchItemPackingStatus,
    });

    packedBySubmission.set(line.submissionId, {
      lh: sum([existing.lh, remaining.lh]),
      rh: sum([existing.rh, remaining.rh]),
      qty: sum([existing.qty, remaining.qty]),
    });
  }

  if (createRows.length) {
    await db.orderItemDelivery.createMany({
      data: createRows,
    });
  }
  if (props.update)
    await updateSalesStatAction(
      {
        salesId: data?.order.id,
        types: [getDispatchControlType(props.packItems!.dispatchStatus as any)],
      },
      db,
    );
  return {
    created: createRows.length,
    skipped,
  };
}

export async function resetSalesAction(db: Db, salesId) {
  await updateSalesItemControlAction(db, salesId);
  await updateSalesStatControlAction(db, salesId);
}
type SubmitAll = z.infer<typeof updateSalesControlSchema>["submitAll"];
export type SubmitAssingmentsAction = {
  data: RenturnTypeAsync<typeof getSaleInformation>;
  authorId;
  materialReviewId?: number | null;
} & SubmitAll;
export function buildProductionSubmissionPlan(props: SubmitAssingmentsAction) {
  const createSubmissions: CreateSalesAssignmentSubmissionProps["items"] = [];
  const createAssignments: CreateSalesAssignmentProps["items"] = [];
  const submitAll = !props.selections?.length && !props.itemUids?.length;
  for (const item of props.data.items) {
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
  const scopedItems = [
    ...createAssignments.map((item) => ({
      controlUid: item.itemInfo.controlUid,
      salesItemId: item.itemInfo.itemId!,
      assignmentId: null,
    })),
    ...createSubmissions.map((item) => ({
      controlUid: item.itemInfo.controlUid,
      salesItemId: item.itemInfo.itemId!,
      assignmentId: item.assignmentId,
    })),
  ];
  const itemScope = Array.from(
    new Map(
      scopedItems.map((item) => [
        `${item.controlUid}:${item.assignmentId ?? "new"}`,
        item,
      ]),
    ).values(),
  );
  return {
    createAssignments,
    createSubmissions,
    itemScope,
  };
}
export async function submitAssignmentsAction(
  db: Db,
  props: SubmitAssingmentsAction,
) {
  const { assignedToId, authorId, data } = props;
  const submissionMeta = props.submissionSource
    ? { source: props.submissionSource }
    : undefined;
  const { createAssignments, createSubmissions } =
    buildProductionSubmissionPlan(props);
  await createSalesAssignmentAction(db, {
    items: createAssignments,
    submit: true,
    authorId: authorId,
    salesId: data.order.id,
    assignedToId: assignedToId!,
    materialReviewId: props.materialReviewId,
    submissionMeta,
  });
  await createSalesAssignmentSubmissionAction(db, {
    authorId,
    salesId: data.order.id,
    materialReviewId: props.materialReviewId,
    submissionMeta,
    items: createSubmissions,
  });

  return createAssignments.length || createSubmissions.length;
}
interface SubmitNonProductionsAction {
  data: RenturnTypeAsync<typeof getSaleInformation>;
  authorId;
}

export async function submitNonProductionsAction(
  db: Db,
  { data, authorId }: SubmitNonProductionsAction,
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
        item.analytics?.stats.prodAssigned!,
      ),
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
  approvedPackingReportId?: number;
};
