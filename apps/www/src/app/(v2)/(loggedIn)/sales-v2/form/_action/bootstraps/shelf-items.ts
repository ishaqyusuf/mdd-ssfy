"use server";

import categoryUtils from "@/app/(v2)/dyke/category-utils";
import { DykeShelfProducts, prisma } from "@/db";
import dykeShelfItems from "@/lib/data/dyke-shelf-items";
import { uploadFile } from "@/lib/upload-file";

export async function bootstrapShelfItems() {
    let prods: DykeShelfProducts[] = [];
    dykeShelfItems._prods.map(({ cats, products }) => {
        const cat = categoryUtils.generate(cats);
        products?.map(async (product) => {
            prods.push({
                ...product,
                parentCategoryId: cat.parentCategoryId,
                categoryId: cat.categoryId,
                meta: {
                    categoryIds: [cat.categories.map((c) => c.id)],
                },
            } as any);
        });
    });

    let finalProds = await Promise.all(
        prods.map(async (p) => {
            if (p.img) {
                const resp = await uploadFile(p.img, "dyke");
                if (resp?.secure_url) p.img = resp.secure_url.split("dyke/")[1];
            }
            return p;
        }),
    );
    await prisma.dykeShelfCategories.createMany({
        data: categoryUtils.categories,
    });
    await prisma.dykeShelfProducts.createMany({
        data: finalProds as any,
    });
}
