"use server";

import { prisma } from "@/db";
import { negativeQty } from "@/utils/sales-control-util";
import z from "zod";

import { actionClient } from "./safe-action";
import { salesProgressFallBackAction } from "./sales-progress-fallback";
import { updateSalesItemStats } from "./update-sales-item-stat";
import { updateSalesStatAction } from "./update-sales-stat";

const deleteSalesDeliverySchema = z.object({
    deliveryId: z.number(),
    // itemUid: z.string(),
});
export async function deleteSalesDeliveryAction(
    data: z.infer<typeof deleteSalesDeliverySchema>,
    tx: typeof prisma = prisma,
) {
    const delivery = await tx.orderDelivery.findFirstOrThrow({
        where: {
            id: data.deliveryId,
        },
        select: {
            id: true,
            order: {
                select: {
                    id: true,
                    orderId: true,
                },
            },
        },
    });
    await salesProgressFallBackAction({
        salesId: delivery.order.id,
        salesUid: delivery.order.orderId,
        dispatchId: delivery.id,
    });
}
