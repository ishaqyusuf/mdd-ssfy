"use server";

import { paginatedAction } from "@/app/_actions/get-action-utils";
import { prisma, Prisma } from "@/db";
import { BaseQuery } from "@/types/action";

interface QueryProps extends BaseQuery {}
export async function _getDykeDoors(query: QueryProps) {
    // return prisma.$transaction(async (tx) => {
    const where: Prisma.DykeDoorsWhereInput = {};
    if (query._q) where.OR = [{ title: { contains: query._q } }];
    const { pageCount, skip, take } = await paginatedAction(
        query,
        prisma.dykeShelfProducts,
        where,
    );
    const data = await prisma.dykeDoors.findMany({
        where,
        skip,
        take,
        // include: {
        //     category: true,
        // },
    });
    return {
        data,
        pageCount,
    };
    // });
}
