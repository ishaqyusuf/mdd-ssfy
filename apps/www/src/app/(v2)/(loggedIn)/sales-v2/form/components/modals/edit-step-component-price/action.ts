"use server";

import { prisma } from "@/db";

export async function saveAction(products: { id; price; meta }[]) {
    await Promise.all(
        products.map(async (product) => {
            await prisma.dykeProducts.update({
                where: { id: product.id },
                data: {
                    updatedAt: new Date(),
                    meta: product.meta,
                    price: product.price,
                },
            });
        })
    );
}
