import { ISalesOrder, ISalesOrderItem } from "@/types/sales";

export function cloneOrderItem(item: ISalesOrderItem) {
    const {
        id,
        salesOrderId,
        prodStatus,
        prebuiltQty,
        sentToProdAt,
        prodStartedAt,
        prodCompletedAt,
        truckLoadQty,
        meta: { produced_qty, ...itemMeta },
        ...itemData
    } = item;
    return {
        item: ({
            ...itemData,
            meta: { ...itemMeta }
        } as any) as ISalesOrderItem,
        id,
        salesOrderId,
        prodStatus,
        prebuiltQty,
        sentToProdAt,
        prodStartedAt,
        prodCompletedAt,
        truckLoadQty,
        produced_qty
    };
}
export function cloneOrder(order: ISalesOrder) {
    let {
        orderId,
        id,
        status,
        slug,
        amountDue,
        invoiceStatus,
        prodStatus,
        prodId,
        salesRepId,
        builtQty,
        createdAt,
        updatedAt,
        goodUntil,
        deliveredAt,
        paymentTerm,
        inventoryStatus,
        items,
        payments,
        meta: { truckLoadLocation, ...meta },
        ...newOrder
    } = order;
    // if (items)
    //     items = items.map(
    //         ({
    //             id,
    //             salesOrderId,
    //             prodStatus,
    //             prebuiltQty,
    //             sentToProdAt,
    //             prodStartedAt,
    //             prodCompletedAt,
    //             truckLoadQty,
    //             meta: { produced_qty, ...itemMeta },
    //             ...itemData
    //         }) => ({
    //             id,
    //             item: {
    //                 ...itemData,
    //                 meta: itemMeta
    //             }
    //         })
    //     ) as any;
    return {
        newOrder: { ...newOrder, meta } as ISalesOrder,
        orderId,
        id,
        status,
        slug,
        amountDue,
        invoiceStatus,
        prodStatus,
        prodId,
        salesRepId,
        builtQty,
        createdAt,
        updatedAt,
        goodUntil,
        deliveredAt,
        paymentTerm,
        inventoryStatus,
        items,
        payments
    };
}
