"use server";

import { prisma } from "@/db";
import { inToFt, sum } from "@/lib/utils";
import { getSalesOverview } from "../../overview/_actions/get-sales-overview";
import { OrderLineItem } from "square";
import { getOrderAction } from "@/app/(v1)/(loggedIn)/sales/_actions/sales";
import { getSquareDevices } from "@/_v2/lib/square";
import { sessionIsDealerMode } from "@/app/(v1)/_actions/utils";

export type GetSalesPaymentData = NonNullable<
    Awaited<ReturnType<typeof getSalesPaymentData>>
>;
export type CheckoutStatus = "no-status" | "pending" | "success" | "cancelled";
export async function getSalesPaymentData(id) {
    const order = await prisma.salesOrders.findUnique({
        where: { id },
        include: {
            checkouts: {
                where: {
                    deletedAt: null,
                },
            },
            items: true,
            customer: true,
            shippingAddress: true,
            billingAddress: true,
        },
    });
    if (!order) throw Error("Order not found");
    // const pendingCheckouts = order.checkouts?.filter(
    //     (c) => //c.status != "pending" && c.status != "no-status"
    // );
    // const pendingAmount = sum(pendingCheckouts, "amount");

    function getLineItems() {
        const lineItems: OrderLineItem[] = [];
        order.items
            .filter((item) => item.qty && item.rate)
            .map((item) => {
                lineItems.push({
                    name: item.description,
                    quantity: item.qty?.toString(),
                    // itemType: ,
                    basePriceMoney: {
                        amount: Math.round(item.rate * 100) as any,
                        currency: "USD",
                    },
                });
            });
        return lineItems;
    }
    const lineItems = order.isDyke
        ? await getDykeLineItems(order.slug)
        : getLineItems();
    // overview.groupings.
    const dealerMode = await sessionIsDealerMode();
    return {
        ...order,
        dealerMode,
        // orderId: order.id,
        // orderIdStr: order.orderId,
        canCreatePaymentLink: order.amountDue > 0,
        lineItems,
        terminals: await getSquareDevices(),
    };
}
async function getDykeLineItems(slug) {
    const lineItems: OrderLineItem[] = [];
    const overview = await getSalesOverview({
        type: "order",
        slug,
    });
    overview.groupings.doors?.map((d) => {
        d.multiDykeComponents?.map((md) => {
            const dt = md.meta.doorType;
            switch (dt) {
                case "Services":
                    lineItems.push({
                        name: md.description,
                        quantity: md.qty?.toString(),
                        // itemType: dt,
                        basePriceMoney: {
                            amount: Math.round(md.rate * 100) as any,
                            currency: "USD",
                        },
                    });
                    break;
                case "Moulding":
                    lineItems.push({
                        name: md.housePackageTool?.molding?.title,
                        quantity: md.qty?.toString(),
                        // itemType: dt,
                        basePriceMoney: {
                            amount: Math.round(md.rate * 100) as any,
                            currency: "USD",
                        },
                    });
                    break;
                default:
                    md.housePackageTool?.doors?.map((door) => {
                        lineItems.push({
                            name: md.housePackageTool.door?.title,
                            note: [inToFt(door?.dimension)].join("|"),
                            // `${inToFt(door?.dimension)} | ${door.swing} | `,

                            quantity: (
                                door.totalQty || sum([door.lhQty, door.rhQty])
                            )?.toString(),
                            // itemType: dt,
                            basePriceMoney: {
                                amount: Math.round(door.unitPrice * 100) as any,
                                currency: "USD",
                            },
                        });
                    });
                    break;
            }
        });
    });
    return lineItems;
}

async function getLineItems(orderId) {
    const lineItems: OrderLineItem[] = [];
    const order = await getOrderAction(orderId);
}
