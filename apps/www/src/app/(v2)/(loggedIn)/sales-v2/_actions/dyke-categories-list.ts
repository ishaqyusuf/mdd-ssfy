"use server";

import { _cache } from "@/app/(v1)/_actions/_cache/load-data";
import { prisma } from "@/db";

export async function getDykeCategoriesList() {
    // const resp = unstable_cache(async () => {

    // const resp = await _cache(
    //     "dyke-product-categories",
    //     async () => {
    const cats = await prisma.dykeCategories.findMany({});
    const c = cats.map(({ id: value, title: label }) => ({
        label,
        value,
    }));
    return c;
    //     },
    //     "dyke-categories"
    // );

    // return resp;

    // return c;
    // }, ["dyke-product-categories-filter"]);

    // return resp;
}
