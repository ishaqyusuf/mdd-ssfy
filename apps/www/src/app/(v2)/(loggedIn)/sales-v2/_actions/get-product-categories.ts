"use server";

import { _cache } from "@/app/(v1)/_actions/_cache/load-data";
import { prisma } from "@/db";
import { unstable_cache } from "next/cache";

export async function getProductCategoriesFilter() {
    const resp = await _cache(
        "dyke-categories",
        async () => {
            const cats = await prisma.dykeCategories.findMany({});
            const c = cats.map(({ id: value, title: label }) => ({
                label,
                value,
            }));
            return c;
        },
        "dyke-categories",
    );

    return resp;

    // return c;
    // }, ["dyke-product-categories-filter"]);

    // return resp;
}
