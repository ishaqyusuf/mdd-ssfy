"use server";

import { prisma, Prisma } from "@/db";
import { BaseQuery } from "@/types/action";

import { dateQuery, getPageInfo, queryFilter } from "../action-utils";
import { userId } from "../utils";

export interface JobPaymentQueryParamsProps extends BaseQuery {}
export async function getMyPayments(query: JobPaymentQueryParamsProps) {
    query._userId = await userId();
    return await getJobPayments(query);
}
export async function getJobPayments(query: JobPaymentQueryParamsProps) {
    const where = whereJobPayment(query);
    const items = await prisma.jobPayments.findMany({
        where,
        include: {
            user: true,
            payer: {
                include: {
                    roles: true,
                },
            },
            jobs: true,
            //   jobs: true,
            _count: {
                select: {
                    jobs: true,
                },
            },
        },
        ...(await queryFilter(query)),
    });

    const pageInfo = await getPageInfo(query, where, prisma.jobPayments);

    return {
        pageInfo,
        data: items as any,
    };
}
function whereJobPayment(query: JobPaymentQueryParamsProps) {
    // const q = {
    //   contains: query._q || undefined,
    // };
    const where: Prisma.JobPaymentsWhereInput = {
        ...dateQuery(query),
    };
    if (query._userId) where.userId = query._userId;

    return where;
}
