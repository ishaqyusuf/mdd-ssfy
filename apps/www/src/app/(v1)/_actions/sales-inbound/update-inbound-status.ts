"use server";

import { prisma } from "@/db";

export async function updateInboundStatusAction(slug, status) {
    //   await prisma.inboundOrders.update({
    //     where: {
    //       slug,
    //     },
    //     data: {
    //       status,
    //       updatedAt: new Date(),
    //       inboundItems: {
    //         updateMany: {
    //           where: {},
    //           data: {
    //             status,
    //             updatedAt: new Date(),
    //           },
    //         },
    //       },
    //     },
    //   });
}

