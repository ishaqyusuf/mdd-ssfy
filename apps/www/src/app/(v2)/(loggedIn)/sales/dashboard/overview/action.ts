"use server";

import { prisma } from "@/db";

export type GetSalesOverview = Awaited<ReturnType<typeof getSalesOverview>>;
export async function getSalesOverview(slug) {
    const _ = await prisma.salesOrders.findFirstOrThrow({
        where: { slug },
        include: {},
    });
}
