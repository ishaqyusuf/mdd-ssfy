"use server";

import { prisma } from "@/db";
import { CacheNames } from "./load-data";

export async function clearCacheAction(...names: CacheNames[]) {
    await prisma.posts.deleteMany({
        where: {
            type: {
                in: names.map((name) => `${name}-cache`),
            },
        },
    });
}
