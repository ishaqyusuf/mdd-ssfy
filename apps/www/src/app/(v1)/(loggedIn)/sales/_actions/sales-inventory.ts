"use server";

import { prisma } from "@/db";
import { revalidatePath } from "next/cache";

export async function _updateOrderInventoryStatus(id, inventoryStatus, path) {
    await prisma.salesOrders.update({
        where: {
            id
        },
        data: {
            inventoryStatus
        }
    });
    revalidatePath(path, "page");
}
