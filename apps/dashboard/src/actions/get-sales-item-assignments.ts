"use server";

import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import {
    type Qty,
    qtyMatrixDifference,
    transformQtyHandle,
} from "@/utils/sales-control-util";
import { productionStatus } from "@/utils/sales-utils";
import { formatDate } from "@gnd/utils/dayjs";
import type { DispatchItemPackingStatus } from "@sales/types";
import { splitProductionSubmissionQuantities } from "./production-assignment-aggregates";

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
                    materialReview: {
                        select: {
                            id: true,
                            status: true,
                            classificationReason: true,
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
			const aggregates = splitProductionSubmissionQuantities(
				assignment.submissions,
			);
			const completed: Qty = aggregates.finalized;
			const pending = qtyMatrixDifference(qty, aggregates.reported);
            const data = {
                id: assignment.id,
                orderId: assignment.orderId,
                assignedTo: assignment.assignedTo?.name,
                assignedToId: assignment.assignedToId,
                dueDate: assignment.dueDate,
                qty,
                assignedBy: assignment.assignedBy?.name,
				completed,
				reported: aggregates.reported,
				pendingReview: aggregates.pendingReview,
                assignedOn: formatDate(assignment.createdAt),
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
                        materialReview,
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
                            materialReview,
                            delivered: sum(sub.itemDeliveries, "qty"),
                        };
                    },
                ),
				submissionCount: aggregates.reported.qty,
            };

            return data;
        }),
        uid: salesItemControlUid,
    };
}
