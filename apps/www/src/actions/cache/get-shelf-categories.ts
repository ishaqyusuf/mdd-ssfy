"use server";

import { prisma } from "@/db";

export async function getShelfCateogriesAction() {
    const categories = await prisma.dykeShelfCategories.findMany({
        where: {
            deletedAt: null,
        },
        select: {
            id: true,
            name: true,
            type: true,
            categoryId: true,
            parentCategoryId: true,
        },
    });
    return categories.map((cat) => {
        return {
            ...cat,
            type: cat.type as "parent" | "child",
        };
    });
}
