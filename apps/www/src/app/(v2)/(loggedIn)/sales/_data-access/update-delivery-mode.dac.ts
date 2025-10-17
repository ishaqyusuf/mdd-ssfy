"use server";

import { _revalidate, RevalidatePaths } from "@/app/(v1)/_actions/_revalidate";
import { prisma } from "@/db";

export async function updateDeliveryModeDac(
    id,
    mode,
    revalidate?: RevalidatePaths
) {
    await prisma.salesOrders.update({
        where: {
            id,
        },
        data: {
            deliveryOption: mode,
            deliveredAt: null,
        },
    });
    if (revalidate) _revalidate(revalidate);
}
