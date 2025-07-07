"use server";

import { prisma } from "@/db";
import { Tags } from "@/utils/constants";
import { unstable_cache } from "next/cache";

export async function getShelfCateogriesAction() {
    const s = unstable_cache(
        async () => {
            const categories = await prisma.dykeShelfCategories.findMany({
                where: {},
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
        },
        [Tags.shelfCategories],
        {
            tags: [Tags.shelfCategories],
        }
    )();
    return s;
}
