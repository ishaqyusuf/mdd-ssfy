"use server";

import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import {
    Qty,
    qtyMatrixDifference,
    transformQtyHandle,
} from "@/utils/sales-control-util";
import { productionStatus } from "@/utils/sales-utils";
import { DispatchItemPackingStatus } from "@sales/types";

export async function getSalesItemAssignments(
    salesItemControlUid,
    itemId,
    doorId?,
    assignedToId?,
) {
    const assignments = await prisma.orderItemProductionAssignments.findMany({
        where: {
            OR: [
                { salesItemControlUid },
                {
                    itemId,
                    salesDoorId: doorId || undefined,
                },
            ],
            assignedToId: assignedToId || undefined,
        },
        include: {
            submissions: {
                where: {
                    deletedAt: null,
                },
                include: {
                    itemDeliveries: {
                        where: {
                            deletedAt: null,
                            packingStatus:
                                "packed" as DispatchItemPackingStatus,
                            delivery: {
                                deletedAt: null,
                            },
                        },
                        select: {
                            qty: true,
                        },
                    },
                    submittedBy: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            assignedBy: true,
            assignedTo: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    return {
        assignments: assignments.map((assignment) => {
            const qty: Qty = {
                lh: assignment.lhQty,
                rh: assignment.rhQty,
                qty: assignment.qtyAssigned,
            };
            const completed: Qty = {
                lh: sum(assignment.submissions, "lhQty"),
                rh: sum(assignment.submissions, "rhQty"),
                qty: sum(assignment.submissions, "qty"),
            };
            const pending = qtyMatrixDifference(qty, completed);
            const data = {
                id: assignment.id,
                assignedTo: assignment.assignedTo?.name,
                assignedToId: assignment.assignedToId,
                dueDate: assignment.dueDate,
                qty,
                completed,
                pending,
                status: productionStatus(assignment.qtyAssigned, completed.qty),
                submissions: assignment.submissions.map(
                    ({
                        id,
                        qty,
                        lhQty,
                        rhQty,
                        note,
                        createdAt,
                        meta,
                        submittedBy,
                        ...sub
                    }) => {
                        return {
                            id,
                            submitDate: createdAt,
                            qty: transformQtyHandle({
                                qty,
                                lhQty,
                                rhQty,
                            }),
                            note,
                            submittedBy: submittedBy?.name,
                            delivered: sum(sub.itemDeliveries, "qty"),
                        };
                    },
                ),
                submissionCount: sum(assignment.submissions, "qty"),
            };

            return data;
        }),
        uid: salesItemControlUid,
    };
}
