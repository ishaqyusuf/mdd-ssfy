"use server";

import { prisma } from "@/db";

export async function restoreMissingComponentData(itemId, hptId) {
    if (!itemId) throw new Error("Item not found");
    if (!hptId) throw new Error("Invalid restore. hpt required");
    const salesDoors = await prisma.dykeSalesDoors.updateMany({
        where: {
            deletedAt: {},
            housePackageToolId: hptId,
        },
        data: {
            deletedAt: null,
        },
    });
    if (salesDoors.count) return `${salesDoors.count} restored.`;
    else throw new Error("No restore found");
}
