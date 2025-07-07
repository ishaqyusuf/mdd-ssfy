"use server";

import { authId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import { updateQtyControlAction } from "../item-control.action";
import {
    resetSalesStatAction,
    updateSalesStatControlAction,
} from "../sales-stat-control.action";
import { itemControlUidObject } from "../../utils/item-control-utils";
import { _notify } from "@/app/(v1)/_actions/notifications";

export async function createItemAssignmentAction({
    salesItemId,
    assignedToId = null,
    doorId = null,
    salesId,
    lh,
    rh,
    qty,
    dueDate = null,
    uid,
    totalQty,
    produceable,
}) {
    const obj = itemControlUidObject(uid);
    doorId = obj.doorId;
    return (await prisma.$transaction((async (tx: typeof prisma) => {
        const assignment = await tx.orderItemProductionAssignments.create({
            data: {
                salesDoor: doorId
                    ? {
                          connect: { id: doorId },
                      }
                    : undefined,
                order: {
                    connect: { id: salesId },
                },
                lhQty: sum([lh]),
                rhQty: sum([rh]),
                qtyAssigned: qty ? sum([qty]) : sum([lh, rh]),
                assignedTo: assignedToId
                    ? {
                          connect: { id: assignedToId },
                      }
                    : undefined,
                item: {
                    connect: { id: salesItemId },
                },
                dueDate,
                assignedBy: {
                    connect: {
                        id: await authId(),
                    },
                },
            },
        });
        // await _notify(
        //     assignedToId,
        //     "assign production",
        //     `New Production Assigned`,
        //     null,
        //     ``
        // );
        if (produceable) {
            await updateQtyControlAction(uid, "prodAssigned", {
                totalQty,
                qty,
                rh,
                lh,
            });
            await updateSalesStatControlAction(salesId);
        }
        return assignment.id;
    }) as any)) as any;
}
export async function deleteItemAssignmentAction({ id }) {
    return await prisma.$transaction((async (tx: typeof prisma) => {
        const a = await prisma.orderItemProductionAssignments.update({
            where: {
                id,
            },
            data: {
                deletedAt: new Date(),
                submissions: {
                    updateMany: {
                        where: {},
                        data: {
                            deletedAt: new Date(),
                        },
                    },
                },
            },
        });
        await prisma.orderItemDelivery?.updateMany({
            where: {
                submission: {
                    assignment: {
                        id,
                    },
                },
            },
            data: {
                deletedAt: new Date(),
            },
        });
        await resetSalesStatAction(a.orderId);
    }) as any);
}
export async function submitItemAssignmentAction({
    uid,
    totalQty,
    qty,
    rh,
    lh,
    salesId,
    assignmentId,
    salesItemId,
    produceable,
}) {
    return await prisma.$transaction((async (tx: typeof prisma) => {
        await tx.orderProductionSubmissions.create({
            data: {
                lhQty: lh,
                rhQty: rh,
                qty,
                assignment: {
                    connect: {
                        id: assignmentId,
                    },
                },
                order: {
                    connect: {
                        id: salesId,
                    },
                },
                item: {
                    connect: {
                        id: salesItemId,
                    },
                },
            },
        });
        if (produceable) {
            await updateQtyControlAction(uid, "prodCompleted", {
                totalQty,
                qty,
                rh,
                lh,
            });
            await updateSalesStatControlAction(salesId);
        }
    }) as any);
}
export async function updateAssignmentDueDateAction(assignmentId, dueDate) {
    await prisma.orderItemProductionAssignments.update({
        where: {
            id: assignmentId,
        },
        data: {
            dueDate,
        },
    });
}
export async function updateAssignmentAssignedToAction(
    assignmentId,
    assignedToId
) {
    await prisma.orderItemProductionAssignments.update({
        where: {
            id: assignmentId,
        },
        data: {
            assignedToId,
        },
    });
}
export async function deleteSubmissionAction({ id }) {
    return await prisma.$transaction((async (tx: typeof prisma) => {
        const resp = await tx.orderProductionSubmissions.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
        await resetSalesStatAction(resp.salesOrderId);
    }) as any);
}
