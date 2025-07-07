"use server";

import { prisma } from "@/db";
import { unstable_noStore } from "next/cache";

export type CacheNames =
    | "1099-contractors"
    | "punchouts"
    | "employees"
    | "projects"
    | "job-employees"
    | "install-price-chart";
export async function fetchCache(name: CacheNames, group = null) {
    const c = await prisma.cache.findFirst({
        where: {
            name: `${name}-cache`,
            group,
        },
    });
    console.log(["fetching cache->", name, c]);
    const data = (c as any)?.meta?.data;
    // if(!data)return null;
    if (!data || (Array.isArray(data) && !data.length)) return null;

    // if (data) return (c as any).meta.data;
    return data;
}
export async function saveCache(name: CacheNames, data, group) {
    return;
    const type = `${name}-cache`;
    const c = await prisma.cache.create({
        data: {
            name: type,
            group,
            meta: {
                data,
            },
            createdAt: new Date(),
        },
    });
    await prisma.cache.deleteMany({
        where: {
            name: type,
            group,
            id: {
                not: c.id,
            },
        },
    });
}
export async function _cache(name: CacheNames | string, fn, group: any = null) {
    // unstable_noStore();
    // console.log("CATCH LOADING", name);
    // const cdata = await fetchCache(name as any, group);
    // console.log([name, cdata]);

    // if (cdata) return cdata;

    const c = await fn();
    // console.log(["FRESH CACHE", name, c]);
    // await saveCache(name as any, c, group);
    return c;
}
