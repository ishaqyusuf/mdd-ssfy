"use server";

import { prisma, WorkOrders } from "@/db";

export async function findHomeOwnerAction(
    projectName,
    lot,
    block,
): Promise<Partial<WorkOrders>> {
    const w = await prisma.workOrders.findFirst({
        where: {
            projectName,
            lot,
            block,
        },
    });
    if (w) {
        const { homeAddress, homeOwner, homePhone } = w;
        return {
            homeAddress,
            homeOwner,
            homePhone,
        };
    }

    return {};
}
