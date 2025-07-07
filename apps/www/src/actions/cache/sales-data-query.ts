"use server";

import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { Tags } from "@/utils/constants";
import { unstable_cache } from "next/cache";

export async function __getSalesOrderNos() {
    return unstable_cache(async () => {
        const ordersNos = await prisma.salesOrders.findMany({
            where: {
                type: "order" as SalesType,
            },
            select: {
                orderId: true,
            },
        });
        return ordersNos.map((a) => a.orderId);
    }, [Tags.salesOrderNos])();
}
