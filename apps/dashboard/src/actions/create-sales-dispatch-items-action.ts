"use server";

import { prisma } from "@/db";
import { resetSalesAction } from "@sales/sales-control/actions";
import z from "zod";

import { actionClient } from "./safe-action";
import { createSalesDispatchItemsSchema } from "./schema";

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
            await resetSalesAction(tx as any, input.orderId);
        });
    });
