"use server";

import { prisma } from "@/db";
import { serverDate } from "../action-utils";
import { _revalidate } from "../_revalidate";

export async function activateHomeProductionAction(ids: number[], dueDate) {
    // console.log(ids, dueDate);
    const u = await prisma.homeTasks.updateMany({
        where: {
            homeId: {
                in: ids,
            },
            produceable: true,
        },
        data: {
            productionDueDate: serverDate(dueDate),
            sentToProductionAt: new Date(),
        },
    });
    await prisma.homes.updateMany({
        where: {
            tasks: {
                some: {
                    id: {
                        in: ids,
                    },
                },
            },
        },
        data: {
            sentToProdAt: new Date(),
        },
    });
    // console.log(u, dueDate);
}
export async function deactivateProduction(ids: number[]) {
    const u = await prisma.homeTasks.updateMany({
        where: {
            homeId: {
                in: ids,
            },
            produceable: true,
        },
        data: {
            productionDueDate: null,
            sentToProductionAt: null,
        },
    });
    _revalidate("homes");
}
