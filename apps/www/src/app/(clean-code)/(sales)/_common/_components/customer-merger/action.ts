"use server";

import { prisma } from "@/db";

export async function getSalesCustomerConflicts(id) {
    const customer = await prisma.customers.findUnique({
        where: { id },
    });
    const conflicts = await prisma.customers.findMany({
        where: {
            OR: [
                {
                    name: {
                        contains: customer.name,
                    },
                },
                {
                    businessName: {
                        contains: customer.businessName,
                    },
                },
                {
                    phoneNo: {
                        contains: customer.phoneNo,
                    },
                },
            ],
        },
    });

    return conflicts;
}
