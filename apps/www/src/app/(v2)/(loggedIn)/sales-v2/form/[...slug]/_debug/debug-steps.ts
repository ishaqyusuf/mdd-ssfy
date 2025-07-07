"use server";
import { prisma } from "@/db";

export async function stepUpdateDebug() {
    const ls = await prisma.dykeProducts.findMany({
        where: {
            // stepProducts: {
            //     some: {
            //         step: {
            //             title: "Door Type",
            //         },
            //     },
            // },
        },
        include: {
            stepProducts: {
                include: {
                    step: true,
                },
            },
        },
    });
    return ls.filter((s) => s.stepProducts.some((s) => s.step?.meta != null));
    // .filter((s) => s.stepProducts.length > 1)
    // .filter((s) => s.stepProducts.some((p) => p.meta));
}
