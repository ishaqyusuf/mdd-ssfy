"use server";

import { Prisma } from "@/db";
import { ISalesType } from "@/types/sales";

interface QueryProps {
    _q?: string;
    type: ISalesType;
}
export async function getSalesAction(query: QueryProps) {
    const where: Prisma.SalesOrdersWhereInput = {
        type: query.type,
    };
}
