"use server";

import { prisma } from "@/db";
import { getDispatchControlType } from "@/utils/sales-utils";
import z from "zod";

import { actionClient } from "./safe-action";
import { createSalesDispatchItemsSchema } from "./schema";
import { updateSalesItemStats } from "./update-sales-item-stat";
import { updateSalesStatAction } from "./update-sales-stat";

export async function createSalesDispatchItems(
    data: z.infer<typeof createSalesDispatchItemsSchema>,
    tx = prisma,
) {
    const dispatch = await tx.orderItemDelivery.createMany({
        data: Object.values(data.items).map((a) => ({
            orderId: data.orderId,
            orderItemId: a.orderItemId,
            lhQty: a.qty.lh,
            rhQty: a.qty.rh,
            note: a.note,
            orderProductionSubmissionId: a.submissionId,
            qty: a.qty.qty,
            orderDeliveryId: data.deliveryId,
            status: a.status || data.status,
        })),
    });
    return dispatch;
}

export const createSalesDispatchItemsAction = actionClient
    .schema(createSalesDispatchItemsSchema)
    .metadata({
        name: "create-sales-dispatch-items",
    })
    .action(async ({ parsedInput: input }) => {
        const resp = await prisma.$transaction(async (tx: typeof prisma) => {
            const dispatch = await createSalesDispatchItems(input, tx);
            const res = await Promise.all(
                Object.values(input.items).map(async (item) => {
                    return await updateSalesItemStats(
                        {
                            uid: item.itemUid,
                            salesId: input.orderId,
                            type: getDispatchControlType(input.status),
                            itemTotal: item.totalItemQty,
                            qty: item.qty,
                        },
                        tx,
                    );
                }),
            );
            await updateSalesStatAction({
                salesId: input.orderId,
                types: [getDispatchControlType(input.status)],
            });
        });
    });
