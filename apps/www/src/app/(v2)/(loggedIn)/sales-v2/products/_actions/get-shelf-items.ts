"use server";

import { paginatedAction } from "@/app/_actions/get-action-utils";
import { prisma, Prisma } from "@/db";
import { BaseQuery } from "@/types/action";

interface QueryProps extends BaseQuery {}
export async function getShelfItems(query: QueryProps) {
    // return prisma.$transaction(async (tx) => {
    const where: Prisma.DykeShelfProductsWhereInput = {};
    if (query._q) where.OR = [{ title: { contains: query._q } }];
    const { pageCount, skip, take } = await paginatedAction(
        query,
        prisma.dykeShelfProducts,
        where,
    );
    const data = await prisma.dykeShelfProducts.findMany({
        where,
        skip,
        take,
        include: {
            category: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    // console.log(data);

    return {
        data,
        pageCount,
    };
    // });
}
