"use server";

import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import { Qty, qtyMatrixDifference } from "@/utils/sales-control-util";
import { productionStatus } from "@/utils/sales-utils";

export async function getSalesItemAssignments(
    salesItemControlUid,
    itemId,
    doorId?,
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
        },
        include: {
            submissions: {
                where: {
                    deletedAt: null,
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
            // const completed = sum(assignment.submissions, "qty");
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
                        ...sub
                    }) => {
                        // meta = meta as
                        return {
                            id,
                            qty,
                            lhQty,
                            rhQty,
                            note,
                        };
                    },
                ),
            };
            return data;
        }),
        uid: salesItemControlUid,
    };
}
