"use server";

import { SalesMeta } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { sum } from "@/lib/utils";

export async function updateSalesMetaAction(id, metaData: Partial<SalesMeta>) {
    const s = await prisma.salesOrders.findFirstOrThrow({
        where: {
            id,
        },
        select: {
            meta: true,
        },
    });
    const meta = {
        ...((s.meta || {}) as any),
        ...metaData,
    };
    await prisma.salesOrders.update({
        where: {
            id,
        },
        data: {
            meta: meta as any,
        },
    });
}
