"use server";

import { prisma } from "@/db";

export async function findCustomerIdFromBilling(id) {
    const address = await prisma.addressBooks.findFirst({
        where: {
            id,
        },
        include: {
            customer: true,
        },
    });
    if (address?.customer?.id) return address?.customer?.id;
    else {
        const { phoneNo, email, name } = address;
        const customer = await prisma.customers.findFirst({
            where: {
                name,
                phoneNo: phoneNo ? phoneNo : undefined,
            },
            orderBy: {
                createdAt: "desc",
            },
            select: {
                id: true,
                name: true,
                phoneNo: true,
                addressBooks: {
                    select: {
                        id: true,
                    },
                    where: {
                        isPrimary: true,
                    },
                },
            },
        });
        // return { customer, address };
        const [primaryAddress] = customer?.addressBooks;
        if (!primaryAddress)
            await prisma.addressBooks.update({
                where: {
                    id,
                },
                data: {
                    isPrimary: true,
                    customerId: customer.id,
                },
            });
        return customer?.id;
    }
}
