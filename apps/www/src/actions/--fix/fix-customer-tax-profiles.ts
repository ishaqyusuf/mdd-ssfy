"use server";

import { prisma, Prisma } from "@/db";

export async function updateTaxProfilesAction(data) {
    const tax = await prisma.customerTaxProfiles.createMany({
        skipDuplicates: true,
        data,
    });
}
export async function fixCustomerTaxProfilesAction() {
    const orders = await prisma.customers.findMany({
        select: {
            id: true,
            salesOrders: {
                orderBy: {
                    createdAt: "desc",
                },
                select: {
                    taxes: {
                        take: 1,
                        select: {
                            taxConfig: {
                                select: {
                                    title: true,
                                    taxCode: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    const _data = orders
        .map((customer) => {
            const taxCode =
                customer?.salesOrders?.[0]?.taxes?.[0]?.taxConfig?.taxCode;
            return {
                taxCode,
                customerId: customer.id,
            } satisfies Prisma.CustomerTaxProfilesCreateManyInput;
        })
        .filter((a) => a.taxCode);
    return {
        orders,
        _data,
    };
    const tax = await prisma.customerTaxProfiles.createMany({
        skipDuplicates: true,
        data: _data,
    });
    // tax.count
}
