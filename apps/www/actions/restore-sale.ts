"use server";

import { prisma } from "@/db";
import { createSiteActionTicket } from "./create-site-action-ticket";

export async function restoreSale(id) {
    const data = await prisma.salesOrders.update({
        where: {
            id,
            deletedAt: {},
        },
        data: {
            deletedAt: null,
        },
        select: {
            orderId: true,
            id: true,
            type: true,
        },
    });
    await createSiteActionTicket({
        event: "restored",
        type: data.type as any,
        meta: {
            description: `${data.type} ${data.orderId} restored`,
        },
    });
    return data;
}
