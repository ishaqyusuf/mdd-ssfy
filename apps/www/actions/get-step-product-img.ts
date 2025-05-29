"use server";

import { prisma } from "@/db";
import { unstable_cache } from "next/cache";

export async function getStepProductImg(id) {
    return unstable_cache(
        async (id) => {
            const step = await prisma.dykeStepProducts.findFirst({
                where: {
                    id,
                },
                select: {
                    img: true,
                    product: {
                        select: {
                            img: true,
                        },
                    },
                    door: {
                        select: {
                            img: true,
                        },
                    },
                },
            });
            return step?.img || step?.product?.img || step?.door?.img;
        },
        [`step-product-${id}`],
        {
            tags: [`step-product-${id}`],
        },
    )(id);
}
