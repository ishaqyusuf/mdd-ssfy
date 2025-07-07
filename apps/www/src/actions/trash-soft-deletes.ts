"use server";

import { prisma } from "@/db";

export async function trashSoftDeletesAction() {
    console.log("TRASHING>>>>>");

    // const trashables = await Promise.all(
    //     [
    //         prisma.dykeStepForm,
    //         prisma.salesOrders,
    //         prisma.salesOrderItems,
    //         prisma.salesOrderProducts,
    //     ].map(async (table) => {
    //         const c = await table.count({
    //             where: {
    //                 deletedAt: {
    //                     not: null,
    //                 },
    //             },
    //         });
    //         return `${String(table as any)}: ${c}`;
    //     })
    // );

    // console.log(trashables);
}
