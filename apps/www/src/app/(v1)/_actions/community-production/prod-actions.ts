"use server";

import { prisma } from "@/db";
import { revalidatePath } from "next/cache";

export async function _startUnitTaskProduction(id) {
    await prisma.homeTasks.update({
        where: { id },
        data: {
            prodStartedAt: new Date(),
            productionStatus: "Started",
            productionStatusDate: new Date()
        }
    });
    revalidatePath("/community/productions");
}
export async function _stopUnitTaskProduction(id) {
    await prisma.homeTasks.update({
        where: { id },
        data: {
            prodStartedAt: null,
            producedAt: null,
            productionStatus: "Stopped",
            productionStatusDate: new Date()
        }
    });
    revalidatePath("/community/productions");
}
export async function _completeUnitTaskProduction(id) {
    await prisma.homeTasks.update({
        where: { id },
        data: {
            producedAt: new Date(),
            productionStatus: "Completed",
            productionStatusDate: new Date()
        }
    });
    revalidatePath("/community/productions");
}
