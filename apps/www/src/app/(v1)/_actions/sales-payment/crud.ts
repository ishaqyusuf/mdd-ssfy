"use server";

import { prisma, Prisma } from "@/db";
import { BaseQuery } from "@/types/action";

import { dateQuery, getPageInfo, queryFilter } from "../action-utils";

export interface salesPaymentsQueryParamsProps extends BaseQuery {
    _customerId?;
}
export async function getsalesPayments(query: salesPaymentsQueryParamsProps) {
    const where = wheresalesPayments(query);
    const items = await prisma.salesPayments.findMany({
        where,
        include: {
            // customer: {
            //     include: {
            //         wallet: true,
            //     },
            // },
            order: true,
        },
        ...(await queryFilter(query)),
    });

    const pageInfo = await getPageInfo(query, where, prisma.salesPayments);
    return {
        pageInfo,
        data: items as any,
    };
}
function wheresalesPayments(query: salesPaymentsQueryParamsProps) {
    const q = {
        contains: query._q || undefined,
    } as any;
    const where: Prisma.SalesPaymentsWhereInput = {
        customerId: +query._customerId || undefined,
        customer: {
            businessName: q,
            name: q,
            phoneNo: q,
        },
        ...dateQuery(query),
    };
    return where;
}
