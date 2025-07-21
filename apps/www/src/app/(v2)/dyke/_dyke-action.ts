"use server";

import { prisma } from "@/db";

export async function createDykeProducts(products, cats) {
    // return;
    await prisma.dykeShelfCategories.createMany({
        data: cats,
    });
    await prisma.dykeShelfProducts.createMany({
        data: products,
    });
}
