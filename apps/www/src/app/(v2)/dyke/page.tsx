"use client";

import { useEffect } from "react";
import { DykeShelfProducts } from "@/db";

import { createDykeProducts } from "@/app-deps/(v2)/dyke/_dyke-action";
import categoryUtils from "@/app-deps/(v2)/dyke/category-utils";
import { prods } from "@/app-deps/(v2)/dyke/products";

export default function DykePage() {
    useEffect(() => {
        let products: DykeShelfProducts[] = [];
        prods._prods.map((productGroup) => {
            const cat = categoryUtils.generate(productGroup?.cats);

            productGroup?.products?.map((product) => {
                products.push({
                    ...product,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    parentCategoryId: cat.parentCategoryId,
                    categoryId: cat.categoryId,
                    meta: {
                        categoryIds: [cat.categories.map((c) => c.id)],
                    },
                } as any);
            });
        });
        (async () => {
            await createDykeProducts(products, categoryUtils.categories);
        })();
    }, []);

    return <></>;
}
