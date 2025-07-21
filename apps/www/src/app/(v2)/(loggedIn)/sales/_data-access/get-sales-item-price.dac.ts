"use server";

import { prisma } from "@/db";

export async function _getSalesItemPriceByProfile(description, profile = null) {
    const items = (
        await prisma.salesOrderItems.findMany({
            where: {
                description,
            },
            select: {
                price: true,
                id: true,
                salesOrder: {
                    select: {
                        id: true,
                        customer: {
                            select: {
                                profile: {
                                    select: {
                                        id: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        })
    ).filter((item) => item.price);

    return items?.[0]?.price;
}
