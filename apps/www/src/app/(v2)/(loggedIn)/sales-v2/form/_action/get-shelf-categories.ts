"use server";

import { prisma } from "@/db";

export async function _getShelfCategories({
    categoryId,
    parentCategoryId,
}: {
    categoryId;
    parentCategoryId?;
}) {
    const cats = await prisma.dykeShelfCategories.findMany({
        where: {
            categoryId: categoryId > 0 ? categoryId : null,
            // parentCategoryId,
        },
    });
    return cats;
}
