"use server";

import { SalesMeta } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { sum } from "@/lib/utils";

export async function updateSalesAddressAction(id, { shippingId }) {
    await prisma.salesOrders.update({
        where: {
            id,
        },
        data: {
            // customerId,
            // billingAddressId: billingId,
            shippingAddressId: shippingId,
        },
    });
}
