"use server";

import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import { deleteOrderAction } from "@/app/(v1)/(loggedIn)/sales/_actions/sales";
import { prisma } from "@/db";
import { ISalesOrderItemMeta, ISalesOrderMeta } from "@/types/sales";

export async function _cancelBackOrder(slug) {
    let orderSlug = slug.toLowerCase().replace("-bo", "");
    const [order, backOrder] = await prisma.salesOrders.findMany({
        where: { deletedAt: null, slug: { in: [orderSlug, slug] } },
        include: {
            items: true,
            payments: true,
        },
    });
    if (!order || !backOrder)
        throw new Error("Unable to proceed, order or backorder not found");
    const orderMeta: ISalesOrderMeta = order.meta as any;
    const backOrderMeta: ISalesOrderMeta = backOrder.meta as any;

    await prisma.salesOrders.update({
        where: { id: order.id },
        data: {
            amountDue: (order.amountDue || 0) + (backOrder.amountDue || 0),
            grandTotal: (order.grandTotal || 0) + (backOrder.grandTotal || 0),
            subTotal: (order.subTotal || 0) + (backOrder.subTotal || 0),
            prodQty: (order.prodQty || 0) + (backOrder.prodQty || 0),
            builtQty: (order.builtQty || 0) + (backOrder.builtQty || 0),
            tax: (order.tax || 0) + (backOrder.tax || 0),
            meta: {
                ...(order.meta as any),
                ccc: (orderMeta?.ccc || 0) + (backOrderMeta?.ccc || 0),
                labor_cost:
                    (orderMeta?.labor_cost || 0) +
                    (backOrderMeta?.labor_cost || 0),
            } as ISalesOrderMeta as any,
        },
    });
    await prisma.salesPayments.updateMany({
        where: {
            orderId: backOrder.id,
        },
        data: {
            orderId: order.id,
        },
    });
    await Promise.all(
        order.items?.map(async (item) => {
            let backOrderItem = backOrder.items.find(
                (i) =>
                    i.swing == item.swing && i.description == item.description
            );
            if (backOrderItem) {
                console.log("item found");
                let boiMeta = backOrderItem.meta as any as ISalesOrderItemMeta;
                let iMeta = item.meta as any as ISalesOrderItemMeta;
                iMeta.produced_qty =
                    (boiMeta.produced_qty || 0) + (iMeta.produced_qty || 0);
                await prisma.salesOrderItems.update({
                    where: { id: item.id },
                    data: {
                        qty: (item.qty || 0) + (backOrderItem.qty || 0),
                        discount:
                            (item.discount || 0) +
                            (backOrderItem.discount || 0),
                        total: (item.total || 0) + (backOrderItem.total || 0),
                        tax: (item.tax || 0) + (backOrderItem.tax || 0),
                        meta: {
                            ...iMeta,
                        } as any,
                    },
                });
            }
        })
    );
    await deleteOrderAction(backOrder.id);
    _revalidate("backorders");
}
