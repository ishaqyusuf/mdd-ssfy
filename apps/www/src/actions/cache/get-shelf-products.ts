"use server";

import { prisma } from "@/db";

export const getShelfProductsAction = async (categoryId?, page?) => {
    const activeCategories = await prisma.dykeShelfCategories.findMany({
        where: {
            deletedAt: null,
        },
        select: {
            id: true,
        },
    });
    const activeCategoryIds = activeCategories
        .map((category) => Number(category.id || 0))
        .filter(Boolean);
    const products = await prisma.dykeShelfProducts.findMany({
        where: {
            deletedAt: null,
            AND: [
                {
                    OR: [
                        { categoryId: null },
                        { categoryId: { in: activeCategoryIds } },
                    ],
                },
                {
                    OR: [
                        { parentCategoryId: null },
                        {
                            parentCategoryId: {
                                in: activeCategoryIds,
                            },
                        },
                    ],
                },
            ],
            categoryId: categoryId
                ? {
                      in: categoryId,
                  }
                : undefined,
        },
        select: {
            id: true,
            categoryId: true,
            title: true,
            unitPrice: true,
            img: true,
        },
        orderBy: {
            title: "asc",
        },
        take: categoryId?.length > 1 ? undefined : 40,
        skip: page ? page * 40 : undefined,
    });
    return {
        products: products.map((prod) => prod),
        page: page ? ++page : 1,
    };
};
