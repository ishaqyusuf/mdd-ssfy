"use server";

import { fixDbTime } from "@/app/(v1)/_actions/action-utils";
import { authId } from "@/app/(v1)/_actions/utils";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { Prisma, prisma } from "@/db";
import dayjs from "dayjs";

async function countSales(query: SearchParamsType) {
    const where = await whereSales(query);
    const count = await prisma.salesOrders.count({
        where,
    });
    return count;
}
export async function getSalesProductionQueryTabs() {
    return [];
    const baseQuery: SearchParamsType = {
        "production.assignedToId": await authId(),
        "sales.type": "order",
    };
    return [
        {
            title: `Due Today`,
            value: "due-today",
            count: await countSales({
                ...baseQuery,
                "production.status": "due today",
            }),
        },
        {
            title: `Past Due`,
            value: "past-due",
            count: await countSales({
                ...baseQuery,
                "production.status": "past due",
            }),
        },
        {
            title: `Completed`,
            value: "completed",
            count: await await countSales({
                ...baseQuery,
                "production.status": "completed",
            }),
        },
        {
            title: `All`,
            value: "all",
            count: await await countSales({
                ...baseQuery,
                // "production.status": "completed",
            }),
        },
    ];
}
async function whereSales(
    query: SearchParamsType,
): Promise<Prisma.SalesOrdersWhereInput> {
    const assignedToId = await authId();
    switch (query["production.status"]) {
        case "completed":
            return {
                // assignments: {}
            };
        case "past due":
            return {
                assignments: {
                    some: {
                        assignedToId: assignedToId,
                        deletedAt: null,
                        dueDate: {
                            lt: fixDbTime(dayjs()).toISOString(),
                        },
                    },
                },
            };
        default:
            return {};
    }
}
