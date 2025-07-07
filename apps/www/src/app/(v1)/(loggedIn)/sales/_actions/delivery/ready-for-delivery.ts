"use server";

import { TruckLoaderForm } from "@/components/_v1/sales/load-delivery/load-delivery";
import { prisma } from "@/db";
import { _createSalesBackOrder } from "../_sales-back-order";
import { ISalesOrderMeta } from "@/types/sales";
import { redirect } from "next/navigation";

export async function _readyForDelivery(data: TruckLoaderForm) {
    const resp = await Promise.all(
        Object.entries(data.loader).map(async ([slug, order]) => {
            const _order = await prisma.salesOrders.findFirst({
                where: {
                    slug,
                },
                include: {
                    items: true,
                    payments: {
                        orderBy: {
                            createdAt: "desc",
                        },
                    },
                },
            });
            if (order.hasBackOrder) {
                //handle back-order
                if (_order) {
                    return await _createSalesBackOrder(
                        _order as any,
                        data,
                        "Ready"
                    );
                }
            } else {
                await prisma.salesOrders.updateMany({
                    where: {
                        slug,
                    },
                    data: {
                        status: "Ready",
                        meta: {
                            ...((_order?.meta || {}) as any),
                            // truckLoadLocation: order.truckLoadLocation,
                            truck: data.truck,
                        } as ISalesOrderMeta as any,
                        updatedAt: new Date(),
                    },
                });
            }
            //no-back order
            // return { slug, msg: "no back-order" };
        })
    );
    redirect("/sales/delivery");
    return resp;
}
