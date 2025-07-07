"use server";

import { prisma } from "@/db";

export async function updateSalesAddress(
    id,
    customerId,
    billingAddressId,
    shippingAddressId
) {
    function rel(id) {
        return !id ? { disconnect: true } : { connect: { id } };
    }
    await prisma.salesOrders.update({
        where: { id },
        data: {
            customer: rel(customerId),
            billingAddress: rel(billingAddressId),
            shippingAddress: rel(shippingAddressId),
            updatedAt: new Date(),
        },
    });
}
