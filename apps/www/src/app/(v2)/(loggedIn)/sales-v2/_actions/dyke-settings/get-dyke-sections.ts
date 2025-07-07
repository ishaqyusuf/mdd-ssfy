"use server";

import { prisma } from "@/db";

export async function getDykeSections() {
    const sections = await prisma.dykeSteps.findMany({});
    const unique = sections
        .filter(
            (s, si) => si == sections.findIndex((s1) => s1.title == s.title)
        )
        .filter((s) => s.title?.trim());

    // console.log(unique);

    return unique;
}
