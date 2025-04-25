"use server";

import { prisma, Prisma } from "@/db";
import { removeEmptyValues } from "@/lib/utils";
import { IProductVariantMeta } from "@/types/product";
import { InventoryComponentCategory } from "@/types/sales";

export interface ISearchQuery {
    category?: InventoryComponentCategory;
    q?;
    productId?;
}
export async function searchOrderInventoryAction(query: ISearchQuery) {
    const { q, category } = query;
    const where: any = {
        category,
    };

    if (q) {
        where.OR = [
            {
                description: {
                    contains: q || undefined,
                },
            },
            {
                name: {
                    contains: q || undefined,
                },
            },
        ];
    }
    // const products = await prisma.orderInventory.findMany({
    //   take: 10,
    //   where,
    //   distinct: "name",
    // });
    // await prisma.orderInventory.groupBy({});
    const groupByArgs = {
        by: ["name"],
        orderBy: {
            name: "asc",
        },
        take: 10,
        where,
    } satisfies any;
    // const prods = await prisma.orderInventory.groupBy(groupByArgs);
    // console.log(prods);
    return [];
}
interface getComponentCostHistoryQuery {
    title;
    category: InventoryComponentCategory;
}
export async function getComponentCostHistoryAction(
    query: getComponentCostHistoryQuery,
) {
    return {} as any;
    // const { title, category } = query;
    // const where: any = {
    //     category,
    //     name: title,
    //     price: {
    //         gt: 0,
    //     },
    // };
    // const products = await prisma.orderInventory.findMany({
    //     // take: 5,
    //     where,
    //     // select: {
    //     //     id:true,
    //     //     name: true,
    //     //     price: true
    //     // },
    //     // distinct: ["price"],
    //     include: {
    //         product: true,
    //     },
    // });
    // console.log(products);
    // return products;
}
export interface InvCompTitleProps {
    title;
    oldTitle?;
    variantId;
    meta: IProductVariantMeta;
}
export async function updateInventoryComponentTitleAction({
    title,
    oldTitle,
    variantId,
    meta,
}: InvCompTitleProps) {
    meta.componentTitle = title;
    // await prisma.productVariants.update({
    //     where: { id: variantId },
    //     data: {
    //         meta: removeEmptyValues(meta),
    //     },
    // });
}
