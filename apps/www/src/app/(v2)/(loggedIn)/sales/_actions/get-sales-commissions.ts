"use server";

import { prisma, Prisma } from "@/db";
import { queryBuilder } from "@/lib/db-utils";

interface Query {
    _userId;
}
export async function _getSalesCommissionsAction(query: Query) {
    const b = await queryBuilder<Prisma.SalesCommisionWhereInput>(
        query,
        prisma.commissionPayment,
        false,
    );
    return b.response(
        await prisma.salesCommision.findMany({
            ...b._prismaArgs(),
            include: {
                user: true,
                order: true,
            },
        }),
    );
}
