"use server";

import { prisma } from "@/db";
import { revalidatePath } from "next/cache";

export async function saveDykeProduct(form) {
    const { id, ...data } = form;
    if (!id)
        await prisma.dykeProducts.create({
            data,
        });
    else
        await prisma.dykeProducts.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    revalidatePath("/sales-v2/products");
}
