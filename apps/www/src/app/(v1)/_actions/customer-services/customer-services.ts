"use server";

import { prisma, Prisma } from "@/db";
import { whereQuery } from "@/lib/db-utils";
import { BaseQuery } from "@/types/action";

import { getPageInfo, queryFilter } from "../action-utils";

export interface CustomerServiceQueryParamsProps extends BaseQuery {
    _show: "scheduled" | "incomplete" | "completed";
}
export async function getCustomerServices(
    query: CustomerServiceQueryParamsProps,
) {
    const where = whereCustomerService(query);
    const items = await prisma.workOrders.findMany({
        where,
        include: {
            tech: true,
        },
        ...(await queryFilter(query)),
    });

    const pageInfo = await getPageInfo(query, where, prisma.workOrders);

    return {
        pageInfo,
        data: items as any,
    };
}
function whereCustomerService(query: CustomerServiceQueryParamsProps) {
    const q = {
        contains: query._q || undefined,
    };
    const _where = whereQuery<Prisma.WorkOrdersWhereInput>(query);
    _where.searchQuery("description", "projectName", "homeOwner", "homePhone");
    _where.orWhere("status", query._show);
    _where.orWhere("techId", Number(query._userId));
    return _where.get();
}
