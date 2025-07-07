"use server";

import { prisma, Prisma } from "@/db";
import { queryBuilder } from "@/lib/db-utils";
import { BaseQuery } from "@/types/action";

interface Query extends BaseQuery {}
export async function getDykeProducts(q: Query) {
    const builder = await queryBuilder<Prisma.DykeProductsWhereInput>(
        q,
        prisma.dykeProducts,
    );
    builder.searchQuery("title", "description");
    return {
        pageInfo: await builder.pagePageInfo(),
        data: await prisma.dykeProducts.findMany({
            where: builder.getWhere(),
            ...builder.queryFilters,
            include: {
                category: true,
            },
        }),
    };
}
