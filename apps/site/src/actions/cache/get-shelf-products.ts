"use server";
import { prisma } from "@/db";
import { Tags } from "@/utils/constants";
import { unstable_cache } from "next/cache";

export const getShelfProductsAction = async (categoryId?, page?) => {
    return unstable_cache(
        async (categoryId?, page?) => {
            const products = await prisma.dykeShelfProducts.findMany({
                where: {
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
        },
        [Tags.shelfProducts],
        {
            tags: [
                Tags.shelfProducts,
                // , `shelf_products_${categoryId}_${page}`
            ],
        }
    )(categoryId, page);
};
