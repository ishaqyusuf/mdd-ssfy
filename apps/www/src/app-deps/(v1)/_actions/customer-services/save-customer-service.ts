"use server";

import { prisma, WorkOrders } from "@/db";
import { slugModel, transformData } from "@/lib/utils";

export async function createCustomerService(data: WorkOrders) {
    data.slug = await slugModel(
        `${data.projectName} ${data.lot} ${data.block}`,
        prisma.workOrders,
    );
    await prisma.workOrders.create({
        data: transformData(data) as any,
    });
}
export async function updateCustomerService(_data: WorkOrders) {
    const { id, techId, ...data } = _data;
    await prisma.workOrders.update({
        where: { id },
        data: transformData(data, true) as any,
    });
}
