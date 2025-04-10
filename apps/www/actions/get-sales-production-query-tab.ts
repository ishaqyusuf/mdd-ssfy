"use server";

import { authId } from "@/app/(v1)/_actions/utils";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { whereSales } from "@/utils/db/where.sales";

async function countSales(query: SearchParamsType) {
    const where = whereSales(query);
    const count = await prisma.salesOrders.count({
        where,
    });
}
export async function getSalesProductionQueryTab() {
    const baseQuery: SearchParamsType = {
        "production.assignedToId": await authId(),
        "sales.type": "order",
    };
    return [
        {
            title: `Due Today`,
            count: await countSales({
                ...baseQuery,
                "production.status": "due today",
            }),
        },
        {
            title: `Past Due`,
            count: await countSales({
                ...baseQuery,
                "production.status": "past due",
            }),
        },
        {
            title: `Completed`,
            count: await await countSales({
                ...baseQuery,
                "production.status": "completed",
            }),
        },
    ];
}
