"use server";

import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import { AsyncFnType } from "@/types";

export type GetSalesPaymentCheckoutInfo = AsyncFnType<
    typeof getSalesPaymentCheckoutInfoAction
>;
export async function getSalesPaymentCheckoutInfoAction(slugs, emailToken) {
    const orders = await prisma.salesOrders.findMany({
        where: {
            slug: {
                in: slugs,
            },
            OR: [
                {
                    customer: {
                        email: {
                            startsWith: emailToken,
                        },
                    },
                },
                {
                    billingAddress: {
                        email: {
                            startsWith: emailToken,
                        },
                    },
                },
            ],
        },
        select: {
            id: true,
            orderId: true,
            amountDue: true,
            billingAddress: {
                select: {
                    email: true,
                    name: true,
                    phoneNo: true,
                    address1: true,
                },
            },
            customer: {
                select: {
                    address: true,
                    name: true,
                    businessName: true,
                    phoneNo: true,
                    email: true,
                    wallet: {
                        select: {
                            id: true,
                        },
                    },
                },
            },
        },
    });
    if (orders.length != slugs?.length) throw new Error("Unauthorized");
    const ls = orders.map((order) => ({
        customerName:
            order.customer?.name ||
            order.customer?.businessName ||
            order.billingAddress?.name,
        amountDue: order.amountDue,
        id: order.id,
        orderNo: order.orderId,
        email: order.customer?.email || order?.billingAddress?.email,
        address: order?.billingAddress?.address1 || order?.customer?.address,
    }));
    const phoneNoList = Array.from(
        new Set(
            orders
                .map((order) =>
                    [
                        order.customer?.phoneNo,
                        order.billingAddress?.phoneNo,
                    ]?.filter(Boolean),
                )
                .flat(),
        ),
    );
    const primaryPhone = phoneNoList.length == 1 ? phoneNoList?.[0] : null;
    const email = ls.filter((a) => a.email?.startsWith(emailToken))?.[0]?.email;
    const address = ls.filter((a) => a.address)?.[0]?.address;
    return {
        email,
        address,
        orders: ls,
        phoneNoList,
        primaryPhone,
        amountDue: sum(
            ls.filter((a) => a.amountDue > 0),
            "amountDue",
        ),
    };
    // return order;
}
