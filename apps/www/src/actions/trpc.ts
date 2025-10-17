"use server";

import { prisma } from "@/db";
import { getSalesLifeCycle } from "@api/db/queries/sales";

async function trpcContext() {
    return {
        db: prisma,
    };
}
export async function trpcGetSalesItemsOverviewAction(orderId, assignedToId?) {
    const ctx = await trpcContext();
    const res = await getSalesLifeCycle(ctx, {
        salesNo: orderId,
        assignedToId,
    });
    return res;
}

