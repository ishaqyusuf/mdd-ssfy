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
                    name: true,
                    product: {
                        select: {
                            img: true,
                            title: true,
                        },
                    },
                    door: {
                        select: {
                            img: true,
                            title: true,
                        },
                    },
                },
            });
            return {
                img: step?.img || step?.product?.img || step?.door?.img,
                title: step?.name || step?.product?.title || step?.door?.title,
            };
        },
        [`step-product-${id}`],
        {
            tags: [`step-product-${id}`],
        },
    )(id);
}
