"use server";

import { prisma } from "@/db";
import { negativeQty } from "@/utils/sales-control-util";
import { getDispatchControlType } from "@/utils/sales-utils";
import z from "zod";

import { actionClient } from "./safe-action";
import { updateDispatchStatusSchema } from "./schema";
import { updateSalesItemStats } from "./update-sales-item-stat";
import { updateSalesStatAction } from "./update-sales-stat";

export async function updateDispatchStatus(
    data: z.infer<typeof updateDispatchStatusSchema>,
    tx = prisma,
) {
    const dispatch = await tx.orderDelivery.update({
        where: {
            id: data.deliveryId,
        },
        data: {
            status: data.status,
            items: {
                updateMany: {
                    where: {
                        deletedAt: null,
                    },
                    data: {
                        status: data.status,
                    },
                },
            },
        },
        select: {
            items: {
                where: {
                    deletedAt: null,
                },
                select: {
                    lhQty: true,
                    rhQty: true,
                    qty: true,
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
            },
        },
    });
    return dispatch;
}

export const updateDispatchStatusAction = actionClient
    .schema(updateDispatchStatusSchema)
    .metadata({
        name: "create-sales-dispatch-items",
    })
    .action(async ({ parsedInput: input }) => {
        const resp = await prisma.$transaction(async (tx: typeof prisma) => {
            const dispatch = await updateDispatchStatus(input, tx);
            await Promise.all(
                dispatch.items.map(async (item) => {
                    await updateSalesItemStats(
                        {
                            uid: item.submission.assignment.salesItemControlUid,
                            salesId: input.orderId,
                            type: getDispatchControlType(input.status),
                            // itemTotal: item.totalItemQty,
                            qty: {
                                lh: item.lhQty,
                                rh: item.rhQty,
                                qty: item.qty,
                            },
                        },
                        tx,
                    );
                    await updateSalesItemStats(
                        {
                            uid: item.submission.assignment.salesItemControlUid,
                            salesId: input.orderId,
                            type: getDispatchControlType(input.oldStatus),
                            // itemTotal: item.totalItemQty,
                            qty: negativeQty({
                                lh: item.lhQty,
                                rh: item.rhQty,
                                qty: item.qty,
                            }),
                        },
                        tx,
                    );
                }),
            );
            await updateSalesStatAction({
                salesId: input.orderId,
                types: [
                    getDispatchControlType(input.status),
                    getDispatchControlType(input.oldStatus),
                ],
            });
        });
    });
