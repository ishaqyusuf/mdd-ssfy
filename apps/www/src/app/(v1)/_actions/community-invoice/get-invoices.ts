"use server";

import { prisma, Prisma } from "@/db";
import { BaseQuery } from "@/types/action";

import { getPageInfo, queryFilter } from "../action-utils";
import { HomeQueryParams, whereHome } from "../community/home";

export interface InvoiceQueryParams extends BaseQuery {}
export async function getHomeInvoices(query: HomeQueryParams) {
    if (query._production == "sort") {
        query.sort = "sentToProdAt";
        query.sort_order = "desc";
    }
    const where = await whereHome(query);
    const _items = await prisma.homes.findMany({
        where,
        ...(await queryFilter(query)),
        include: {
            project: {
                include: {
                    builder: true,
                },
            },
            tasks: true,
        },
    });
    const pageInfo = await getPageInfo(query, where, prisma.homes);

    return {
        pageInfo,
        data: _items as any,
    };
}
function whereInvoice(query: InvoiceQueryParams) {
    const q = {
        contains: query._q || undefined,
    };
    const where: Prisma.InboxWhereInput = {
        // builderId: {
        //   equals: Number(query._builderId) || undefined,
        // },
    };

    return where;
}
