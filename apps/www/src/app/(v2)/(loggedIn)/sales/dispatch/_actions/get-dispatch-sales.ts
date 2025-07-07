"use server";

import { prisma } from "@/db";
import { whereDispatchSalesOrders } from "./where";
import { paginatedAction } from "@/app/_actions/get-action-utils";

export async function getDispatchSales(query) {
    console.log(query);

    // return await prisma.$transaction(async (tx) => {
    const where = whereDispatchSalesOrders(query);
    const { pageCount, skip, take } = await paginatedAction(
        query,
        prisma.orderDelivery,
        where
    );
    const data = await prisma.orderDelivery.findMany({
        where,
        skip,
        take,
        orderBy: {
            createdAt: "desc",
        },
        include: {
            // approvedBy: true,
            order: {
                include: {
                    customer: true,
                },
            },
        },
    });
    return {
        data,
        pageCount,
    };
    // });
}
