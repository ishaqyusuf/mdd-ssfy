import { userId } from "@/app/(v1)/_actions/utils";
import { prisma, Prisma } from "@/db";
import { sum } from "@/lib/utils";

import { excludeDeleted } from "../utils/db-utils";
import { Qty } from "./dto/sales-item-dto";
import {
    salesAssignmentCreated,
    updateSalesProgressDta,
} from "./sales-progress.dta";
import { DispatchItemPackingStatus } from "@sales/types";

export async function createItemAssignmentDta(
    data: Prisma.OrderItemProductionAssignmentsCreateInput,
    produceable,
) {
    if (!data.qtyAssigned) data.qtyAssigned = sum([data.lhQty, data.rhQty]);
    if (!data.assignedTo?.connect?.id) data.assignedTo = undefined;

    const assignment = await prisma.orderItemProductionAssignments.create({
        data,
    });
    if (produceable)
        await salesAssignmentCreated(data.order.connect.id, data.qtyAssigned);
    return assignment;
}
export async function deleteAssignmentDta(
    assignmentId,
    produceable,
    // deliverable
) {
    const a = await prisma.orderItemProductionAssignments.update({
        where: {
            id: assignmentId,
        },
        data: {
            deletedAt: new Date(),
            // submissions: {
            //     updateMany: {
            //         where: {},
            //         data: {
            //             deletedAt: new Date(),

            //         },
            //     },
            // },
        },
        include: {
            submissions: {
                ...excludeDeleted,
                select: {
                    id: true,
                    qty: true,
                    itemDeliveries: {
                        where: {
                            ...excludeDeleted.where,
                            packingStatus:
                                "packed" as DispatchItemPackingStatus,
                        },
                        select: {
                            id: true,
                            qty: true,
                        },
                    },
                },
            },
        },
    });
    if (produceable)
        await updateSalesProgressDta(a.orderId, "prodAssigned", {
            minusScore: a.qtyAssigned,
        });
    const submissions = a.submissions;
    if (submissions.length) {
        const submissionIds = submissions.map((s) => s.id);
        await prisma.orderProductionSubmissions.updateMany({
            where: {
                id: { in: submissionIds },
            },
            data: {
                deletedAt: new Date(),
            },
        });
        const deliveries = a.submissions.map((s) => s.itemDeliveries).flat();
        const resp = await prisma.orderItemDelivery.updateMany({
            where: {
                orderProductionSubmissionId: {
                    in: submissionIds,
                },
            },
            data: {
                deletedAt: new Date(),
            },
        });
        if (produceable)
            await updateSalesProgressDta(a.orderId, "prodCompleted", {
                minusScore: sum(submissions.map((s) => s.qty)),
            });
        await updateSalesProgressDta(a.orderId, "dispatchCompleted", {
            minusScore: sum(deliveries.map((s) => s.qty)),
        });
    }
}
export async function submitAssignmentDta(
    data: Prisma.OrderProductionSubmissionsCreateInput,
    produceable,
) {
    const c = await prisma.orderProductionSubmissions.create({
        data,
    });
    if (produceable)
        await updateSalesProgressDta(c.salesOrderId, "prodCompleted", {
            plusScore: c.qty,
        });
    return c;
}
export async function deleteAssignmentSubmissionDta(submitId, produceable) {
    const submission = await prisma.orderProductionSubmissions.update({
        where: {
            id: submitId,
        },
        data: {
            deletedAt: new Date(),
        },
    });
    if (produceable)
        await updateSalesProgressDta(submission.salesOrderId, "prodCompleted", {
            minusScore: submission.qty,
        });
}
export async function updateAssignmentDta(
    id,
    data: Prisma.OrderItemProductionAssignmentsUpdateInput,
) {
    return await prisma.orderItemProductionAssignments.update({
        where: { id },
        data,
    });
}

export async function quickCreateAssignmentDta({
    itemId,
    orderId,
    produceable,
    qty,
}: {
    itemId;
    orderId;
    produceable;
    qty: Qty;
}) {
    return await createItemAssignmentDta(
        {
            qtyAssigned: qty.total,
            lhQty: qty.lh,
            rhQty: qty.rh,
            order: {
                connect: {
                    id: orderId,
                },
            },
            item: {
                connect: {
                    id: itemId,
                },
            },
            assignedBy: {
                connect: {
                    id: await userId(),
                },
            },
        },
        produceable,
    );
}
