"use server";

import { paginatedAction } from "@/app/_actions/get-action-utils";
import { dateQuery } from "@/app/(v1)/_actions/action-utils";
import { prisma, Prisma } from "@/db";
import { DeliveryOption } from "@/types/sales";

import { getSalesQties } from "../../_utils/sales-utils";

interface GetDispatchActionProps {
    _type?: DeliveryOption;
    _q?: string;
    _page?: string;
    _show?:
        | "delivered"
        | "ready"
        | "part-delivered"
        | "non-delivered"
        | "late-delivery"
        | undefined;
}
export type GetDispatchSalesAction = NonNullable<
    Awaited<ReturnType<typeof getDispatchSalesAction>>
>;
export async function getDispatchSalesAction(query: GetDispatchActionProps) {
    const where = _where(query);
    const { pageCount, skip, take } = await paginatedAction(
        query,
        prisma.salesOrders,
        where,
    );
    const sales = await prisma.salesOrders.findMany({
        where,
        include: {
            // deliveryProgress: true,
            customer: true,
            shippingAddress: true,
            doors: true,
            items: {
                select: {
                    meta: true,
                    qty: true,
                },
            },
        },
        skip,
        take,
        orderBy: {
            createdAt: "desc",
        },
    });

    return {
        pageCount,
        data: sales.map((sale) => {
            const qties = getSalesQties(sales);

            return {
                ...sale,
                _summary: {
                    ...qties,
                },
            };
        }),
    };
}
function _where(query: GetDispatchActionProps) {
    const where: Prisma.SalesOrdersWhereInput = {};
    switch (query._show) {
        case "delivered":
            // where.deliveryProgress = {
            //     percentage: 100,
            // };
            where.stat.some = {
                type: "delivery",
                percentage: 100,
            };
            break;
        case "non-delivered":
            // where.deliveryProgress = {
            //     id: null,
            // };
            break;
        case "part-delivered":
            // where.deliveryProgress = {
            //     percentage: {
            //         lt: 100,
            //     },
            // };
            break;
        case "late-delivery":
            // where.deliveryProgress = {
            //     ...dateQuery({
            //         _dateType: "deliveryDueDate",
            //         to: new Date(),
            //     }),
            //     percentage: {
            //         lt: 100,
            //     },
            // };
            break;
    }
    // production: in progress,
    if (query._type) where.deliveryOption = query._type;

    return where;
}
