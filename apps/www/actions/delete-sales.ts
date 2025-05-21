"use server";

import { prisma } from "@/db";
import { createSiteActionTicket } from "./create-site-action-ticket";

export async function deleteSaleAction(id) {
    const data = await prisma.salesOrders.update({
        where: {
            id,
        },
        data: {
            deletedAt: new Date(),
        },
        select: {
            orderId: true,
            id: true,
            type: true,
        },
    });
    await createSiteActionTicket({
        event: "deleted",
        type: data.type as any,
        meta: {
            description: `${data.type} ${data.orderId}`,
        },
    });
    return data;
}
