"use server";

import { prisma } from "@/db";

export async function updateCustomerProfile(id, profileId) {
    await prisma.customers.update({
        where: {
            id,
        },
        data: {
            customerTypeId: profileId,
        },
    });
}
