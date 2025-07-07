"use server";

import { prisma, Prisma } from "@/db";
import { BaseQuery } from "@/types/action";

import { getPageInfo, queryFilter } from "../action-utils";

export interface InboundOrderableItemQueryParamProps
    extends Omit<BaseQuery, "_show"> {
    salesOrderItemIds?: number[];
    _show?: "paid" | "all";
    _supplier?;
}
export async function getOrderableItems(
    query: InboundOrderableItemQueryParamProps,
) {
    const where = buildQuery(query);
    const items = await prisma.salesOrderItems.findMany({
        where,
        include: {
            salesOrder: {
                include: {
                    customer: true,
                },
            },
        },
        ...(await queryFilter(query)),
    });
    const pageInfo = await getPageInfo(query, where, prisma.salesOrderItems);
    return {
        pageInfo,
        data: items as any,
    };
}
function buildQuery(query: InboundOrderableItemQueryParamProps) {
    const q = {
        contains: query._q || undefined,
    } as any;
    const where: Prisma.SalesOrderItemsWhereInput = {
        prodStartedAt: null,
        supplier: {
            not: null,
        },
        prodCompletedAt: null,
    };
    if (q.contains) {
        where.OR = [
            {
                salesOrder: {
                    OR: [
                        {
                            orderId: q,
                        },
                        {
                            customer: {
                                OR: [{ name: q }, { phoneNo: q }],
                            },
                        },
                    ],
                },
            },
            {
                description: q,
            },
        ];
    }
    if (query._supplier) {
        let noSupply = false;
        const suppliers = (
            Array.isArray(query._supplier) ? query._supplier : [query._supplier]
        )
            ?.map((f) => {
                if (!noSupply) noSupply = f == "No Supplier";
                return noSupply ? "" : f;
            })
            .filter(Boolean);
        const orSupplier: any = [];
        if (noSupply) orSupplier.push({ supplier: null });
        if (suppliers.length)
            where.supplier = {
                in: suppliers,
            };
        // orSupplier.push({
        //     supplier: { in: suppliers }
        // });
        // if (orSupplier.length) {
        //     if (!where.OR) where.OR = [];
        //     where.OR?.push({
        //         OR: orSupplier
        //     });
        // }
    }
    // if (query.salesOrderItemIds)

    switch (query._show) {
        case "paid":
            where.salesOrder = {
                amountDue: 0,
            };
            break;
    }
    return where;
}
export async function getOrderableItemsCount() {
    const count = await prisma.salesOrderItems.count({
        where: {
            prodStartedAt: null,
            supplier: {
                not: null,
            },
            prodCompletedAt: null,

            // prodStatus: {
            //     not: {
            //         contains: "Completed"
            //     }
            // }
        },
    });
    return count;
}
