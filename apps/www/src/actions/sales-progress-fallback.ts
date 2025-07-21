"use server";

import { prisma } from "@/db";

import { resetSalesStatAction } from "./reset-sales-stat";

export interface SalesProgressFallback {
    dispatchId?;
    salesId;
    salesUid;
    dispatchItemIds?: number[];
    submissionIds?: number[];
    assignmentIds?: number[];
}
export async function salesProgressFallBackAction(
    props: SalesProgressFallback,
) {
    await prisma.$transaction(async (tx) => {
        if (props.dispatchItemIds?.length)
            await tx.orderItemDelivery.deleteMany({
                where: {
                    OR: [
                        {
                            id: { in: props.dispatchItemIds },
                        },
                        {
                            orderDeliveryId: props.dispatchId,
                        },
                    ],
                },
            });
        if (props.dispatchId)
            await tx.orderDelivery.delete({
                where: { id: props.dispatchId },
            });
        if (props.submissionIds?.length)
            await tx.orderProductionSubmissions.deleteMany({
                where: {
                    id: {
                        in: props.submissionIds,
                    },
                },
            });
        if (props.assignmentIds?.length)
            await tx.orderItemProductionAssignments.deleteMany({
                where: {
                    id: { in: props.assignmentIds },
                },
            });
    });
    await resetSalesStatAction(props.salesId, props.salesUid);
}
