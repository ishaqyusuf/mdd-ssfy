"use server";

import { SalesDispatchStatus } from "@/app/(clean-code)/(sales)/types";
import { Prisma, prisma } from "@/db";
import {
    negativeQty,
    qtyMatrixSum,
    transformQtyHandle,
} from "@/utils/sales-control-util";
import z from "zod";

import { actionClient } from "./safe-action";
import { updateSalesItemStats } from "./update-sales-item-stat";
import { updateSalesStatAction } from "./update-sales-stat";

export const deleteSalesDeliveryItemSchema = z.object({
    submissionId: z.number().optional(),
    deliveryId: z.number().optional(),
    assignmentId: z.number().optional(),
    salesId: z.number(),
    dispatchStatus: z.string() as z.ZodType<SalesDispatchStatus>,
});
export async function deleteSalesDeliveryItem(
    data: z.infer<typeof deleteSalesDeliveryItemSchema>,
    tx: typeof prisma = prisma,
) {
    const whereQueries: Prisma.OrderItemDeliveryWhereInput[] = [];
    if (data.submissionId)
        whereQueries.push({
            orderProductionSubmissionId: data.submissionId,
        });
    if (data.deliveryId)
        whereQueries.push({
            orderDeliveryId: data.deliveryId,
        });
    if (data.assignmentId)
        whereQueries.push({
            submission: {
                assignmentId: data.assignmentId,
            },
        });
    const where =
        whereQueries.length > 0
            ? {
                  OR: whereQueries,
              }
            : whereQueries[0];
    const resp = await tx.orderItemDelivery.findMany({
        where,
        select: {
            id: true,
            qty: true,
            lhQty: true,
            rhQty: true,
            submission: {
                select: {
                    assignment: {
                        select: {
                            salesItemControlUid: true,
                        },
                    },
                },
            },
        },
    });
    await tx.orderItemDelivery.updateMany({
        where,
        data: {
            deletedAt: new Date(),
        },
    });
    return resp;
}
export const deleteSalesDeliveryItemAction = actionClient
    .schema(deleteSalesDeliveryItemSchema)
    .metadata({
        name: "delete-sales-delivery-item",
        track: {},
    })
    .action(async ({ parsedInput: input }) => {
        const resp = await prisma.$transaction(async (tx: typeof prisma) => {
            const items = await deleteSalesDeliveryItem(input, tx);
            const type =
                input.dispatchStatus == "cancelled"
                    ? "dispatchCancelled"
                    : input.dispatchStatus == "completed"
                      ? "dispatchCompleted"
                      : input.dispatchStatus == "in progress"
                        ? "dispatchInProgress"
                        : "dispatchAssigned";
            await Promise.all(
                items.map(async (item, index) => {
                    let commonItems = items.filter(
                        (i) =>
                            i.submission.assignment.salesItemControlUid ==
                            item.submission.assignment.salesItemControlUid,
                    );
                    if (item.id != commonItems[0]?.id) return;
                    const itemUid =
                        item.submission.assignment.salesItemControlUid;
                    await updateSalesItemStats({
                        uid: itemUid,
                        salesId: input.salesId,
                        type,
                        qty: negativeQty(
                            qtyMatrixSum(
                                ...commonItems.map(transformQtyHandle),
                            ),
                        ),
                    });
                }),
            );
            await updateSalesStatAction(
                {
                    salesId: input.salesId,
                    types: [type],
                },
                tx,
            );
            return {};
        });
        return resp;
    });
