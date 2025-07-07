"use server";

import { prisma } from "@/db";
import { convertToNumber } from "@/lib/use-number";
import { ISalesOrderItem } from "@/types/sales";

export async function _updateProdQty(salesOrderId, isCompleted = false) {
    let prodQty = 0;
    let builtQty = 0;
    let order = await prisma.salesOrders.findUnique({
        where: {
            id: salesOrderId,
        },
        include: {
            items: {
                select: {
                    swing: true,
                    qty: true,
                    meta: true,
                },
            },
        },
    });
    const _startedItems = (order?.items as any as ISalesOrderItem[])?.filter(
        (i) => i.swing && typeof i.meta.produced_qty === "number"
    );
    const started = _startedItems?.length > 0;
    if (order != null)
        order.items.map((item) => {
            let {
                qty,
                swing,
                meta: { produced_qty },
            } = item as any as ISalesOrderItem;
            qty ||= 0;
            produced_qty ||= 0;
            if (swing && qty > 0) {
                prodQty += convertToNumber(qty);
                builtQty += convertToNumber(produced_qty);
            }
        });
    let prodStatus = order?.prodStatus;
    if (order?.prodId) {
        prodStatus = "Queued";
    }
    if (started) prodStatus = "Started";
    if (prodQty == builtQty && (builtQty > 0 || isCompleted))
        prodStatus = "Completed";
    await prisma.salesOrders.update({
        where: {
            id: salesOrderId,
        },
        data: {
            builtQty,
            prodQty,
            prodStatus,
        },
    });
}
