"use server";

import { SalesQueryParams } from "@/types/sales";
import { prisma } from "@/db";
import { _revalidate } from "../../../_actions/_revalidate";
import { getPageInfo, queryFilter } from "../../../_actions/action-utils";
import { userId } from "../../../_actions/utils";
import { saveProgress } from "../../../_actions/progress";
import { whereSales } from "@/data-access/sales";

export async function _getSalesPickup(query: SalesQueryParams) {
    query.deliveryOption = "pickup";
    query.type = "order";
    const where = await whereSales(query);

    const _items = await prisma.salesOrders.findMany({
        where,
        ...(await queryFilter(query)),
        include: {
            customer: true,
            pickup: true,
        },
    });
    const pageInfo = await getPageInfo(query, where, prisma.salesOrders);
    return {
        pageInfo,
        data: _items as any,
    };
}
export async function _cancelSalesPickup(salesId) {
    await prisma.salesOrders.update({
        where: { id: salesId },
        data: {
            pickup: {
                disconnect: true,
                delete: true,
            },
        },
    });
    await saveProgress("SalesOrder", salesId, {
        type: "delivery",
        status: "Pickup Cancelled",
        userId: await userId(),
    });
    _revalidate("pickup");
}
export async function _createPickup(salesId, pickupData) {
    const order = await prisma.salesOrders.update({
        where: { id: salesId },
        data: {
            pickup: {
                create: {
                    ...pickupData,
                    pickupApprovedBy: await userId(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            },
        },
        include: {
            pickup: true,
        },
    });
    await saveProgress("SalesOrder", salesId, {
        type: "delivery",
        status: "Order Pickup",
        userId: await userId(),
        description: `Order pickup by ${order.pickup?.pickupBy}`,
    });
    await _revalidate("pickup");
}
export async function updateSalesDelivery(id, status) {
    const updateData: any = {
        status,
        updatedAt: new Date(),
    };
    if (status == "Delivered") updateData.deliveredAt = new Date();
    else updateData.deliveredAt = null;
    await prisma.salesOrders.update({
        where: { id },
        data: {
            ...updateData,
        },
    });
    await _revalidate("delivery");
}
