"use server";

import { _createSalesBackOrder } from "@/app/(v1)/(loggedIn)/sales/_actions/_sales-back-order";
import { TruckLoaderForm } from "@/components/_v1/sales/load-delivery/load-delivery";
import { prisma } from "@/db";
import { ISalesOrderMeta } from "@/types/sales";
import { redirect } from "next/navigation";

export async function _createBackorder(data: TruckLoaderForm) {
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
                    return await _createSalesBackOrder(_order as any, data);
                }
            }
            //no-back order
            // return { slug, msg: "no back-order" };
        })
    );
    redirect("/sales/back-orders");
    return resp;
}
