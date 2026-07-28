import { userId } from "@/app-deps/(v1)/_actions/utils";
import { prisma, Prisma } from "@/db";
import { sum } from "@/lib/utils";
import { resetSalesAction } from "@sales/sales-control/actions";
import { syncInventoryProductionLifecycleForSale } from "@sales/exports";

import { excludeDeleted } from "../utils/db-utils";
import { Qty } from "./dto/sales-item-dto";
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
    await resetSalesAction(prisma as any, data.order.connect.id);
    await syncInventoryProductionLifecycleForSale(
        prisma as any,
        data.order.connect.id,
    );
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
        await prisma.orderItemDelivery.updateMany({
            where: {
                orderProductionSubmissionId: {
                    in: submissionIds,
                },
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }
    await resetSalesAction(prisma as any, a.orderId);
    await syncInventoryProductionLifecycleForSale(prisma as any, a.orderId);
}
export async function submitAssignmentDta(
    data: Prisma.OrderProductionSubmissionsCreateInput,
    produceable,
) {
    const c = await prisma.orderProductionSubmissions.create({
        data,
    });
    await resetSalesAction(prisma as any, c.salesOrderId);
    await syncInventoryProductionLifecycleForSale(prisma as any, c.salesOrderId);
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
    await resetSalesAction(prisma as any, submission.salesOrderId);
    await syncInventoryProductionLifecycleForSale(
        prisma as any,
        submission.salesOrderId,
    );
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
