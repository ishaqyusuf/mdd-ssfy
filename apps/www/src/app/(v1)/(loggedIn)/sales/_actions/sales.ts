"use server";

import { redirect } from "next/navigation";
import { isNewSales } from "@/app/(clean-code)/(sales)/_common/utils/sales-utils";
import { _saveSales } from "@/app/(v2)/(loggedIn)/sales/_data-access/save-sales.persistence";
import { _updateProdQty } from "@/app/(v2)/(loggedIn)/sales/_data-access/update-prod-qty.dac";
import { getSales } from "@/data-access/sales";
import { prisma, Prisma } from "@/db";
import { removeEmptyValues } from "@/lib/utils";
import {
    CopyOrderActionProps,
    IOrderPrintMode,
    ISalesOrder,
    ISalesOrderItemMeta,
    ISalesType,
    SalesQueryParams,
    SaveOrderActionProps,
} from "@/types/sales";

import { _revalidate } from "../../../_actions/_revalidate";
import { getProgress, saveProgress } from "../../../_actions/progress";
import { user, userId } from "../../../_actions/utils";
import { fixSalesPaymentAction } from "./sales-payment";
import { DispatchItemPackingStatus } from "@sales/types";

export async function getSalesOrder(query: SalesQueryParams) {
    query.type = "order";
    return await getSales(query);
}
export async function _getInboundOrders(query: SalesQueryParams) {
    //   query.type = "order";
    return await getSales(query);
}
export async function getOrderAction(orderId, isProd = false) {
    const order = await prisma.salesOrders.findFirst({
        where: {
            orderId,
            // type: {
            //   notIn: ["estimate"],
            // },
        },
        include: {
            customer: {
                include: {
                    wallet: true,
                },
                // wallet: true
            },
            items: {
                where: {
                    deletedAt: null,
                },
                include: {},
                // orderBy: {
                //   swing: "desc",
                // },
            },
            billingAddress: true,
            producer: true,
            salesRep: true,
            shippingAddress: true,
            payments: !isProd
                ? {
                      orderBy: {
                          createdAt: "desc",
                      },
                  }
                : false,
            productions: isProd,
            itemDeliveries: {
                where: {
                    packingStatus: "packed" as DispatchItemPackingStatus,
                },
            },
        },
    });
    if (!order) return null;
    const progress = await getProgress({
        where: [
            {
                progressableId: order.id,
                // progressableType: "SalesOrder",
                // type: "production",
            },
            {
                parentId: order.id,
                // progressableType: "SalesOrderItem",
                type: isProd ? "production" : undefined,
            },
        ],
    });
    function lineIndex(line) {
        return Number(line?.meta?.line_index || line?.meta?.uid || 0);
    }
    return {
        ...order,
        items: order.items.sort((a, b) => lineIndex(a) - lineIndex(b)),
        progress,
    };
}
export async function getSalesEstimates(query: SalesQueryParams) {
    query.type = "quote";
    return await getSales(query);
}

export async function saveOrderAction({
    id,
    order,
    items,
    autoSave,
}: SaveOrderActionProps) {
    const _order = await _saveSales(id, order as any, items);
    await _updateProdQty(_order.id);
    //  console.log(_order)
    //   console.log(sale_order)
    // if (!autoSave || !id)
    // revalidatePath(`/sales/${_order.type}/[slug]/form`, "page");
    return _order;
}
export async function deleteOrderAction(id) {
    await prisma.salesOrders.updateMany({
        where: {
            id,
        },
        data: {
            deletedAt: new Date(),
        },
    });
    return;
}
export async function copyOrderAction({ orderId, as }: CopyOrderActionProps) {
    const items = [];
    const _cloneData: ISalesOrder = (await prisma.salesOrders.findFirst({
        where: {
            orderId,
        },
        include: {
            items: true,
        },
    })) as any;
    const {
        orderId: oldOrderId,
        id,
        status,
        slug,
        // amountDue,
        invoiceStatus,
        prodStatus,
        prodId,
        // salesRepId,
        builtQty,
        createdAt,
        updatedAt,
        goodUntil,
        deliveredAt,
        paymentTerm,
        inventoryStatus,
        items: cItems,
        ...orderData
    } = _cloneData;
    orderData.salesRepId = await userId();
    orderData.amountDue = orderData.grandTotal;
    orderData.type = as;
    orderData.prodDueDate = null;
    const _ = await saveOrderAction({
        order: orderData as any,

        items: cItems?.map((i) => {
            const {
                id,
                salesOrderId,
                createdAt,
                updatedAt,
                meta, //: { produced_qty, ..._meta },
                truckLoadQty,
                ...item
            } = i;
            const { produced_qty, ..._meta } = meta as ISalesOrderItemMeta;
            return {
                ...item,
                meta: removeEmptyValues(_meta),
            };
        }) as any,
    });
    return {
        ..._,
        link: `/sales/${as}/${_.orderId}/form`,
    };
}
export async function salesPrintAction({
    ids,
    printMode,
}: {
    ids;
    printMode: IOrderPrintMode;
}) {
    const isId = ids.every((id) => typeof id === "number");
    if (printMode == "order" && isId)
        await Promise.all(
            ids.map(async (id) => {
                await fixSalesPaymentAction(Number(id));
            }),
        );
    const where: Prisma.SalesOrdersWhereInput = {
        deletedAt: null,
    };
    if (isId) where.id = { in: ids };
    else
        where.slug = {
            in: ids as any,
        };
    const sales = prisma.salesOrders.findMany({
        where,
        include: {
            items: {},
            salesRep: {},
            billingAddress: {},
            shippingAddress: {},
            payments: true,
        },
    });
    return sales;
}
