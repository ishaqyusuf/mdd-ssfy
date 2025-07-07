"use server";

import { prisma } from "@/db";

export async function getShelfCategories() {
    const cats = await prisma.dykeShelfCategories.findMany({
        where: {
            products: {
                some: {},
            },
        },
    });
    return cats.map(({ id: value, name: label }) => ({ value, label }));
}
