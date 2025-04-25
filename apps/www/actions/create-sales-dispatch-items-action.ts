"use server";

import { userId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import z from "zod";

import { actionClient } from "./safe-action";
import { createSalesDispatchItemsSchema } from "./schema";

export async function createSalesDispatchItems(
    data: z.infer<typeof createSalesDispatchItemsSchema>,
    tx = prisma,
) {
    const dispatch = await tx.orderItemDelivery.createMany({
        data: data.items.map((a) => ({
            orderId: data.orderId,
            orderItemId: a.orderItemId,
            lhQty: a.lhQty,
            rhQty: a.rhQty,
            orderProductionSubmissionId: a.submissionId,
            qty: a.qty,
            orderDeliveryId: data.deliveryId,
            status: data.status,
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
        });
    });
