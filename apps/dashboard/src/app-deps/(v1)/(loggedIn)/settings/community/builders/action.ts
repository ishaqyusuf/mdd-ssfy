"use server";

import { prisma } from "@/db";

import { _cache } from "../../../../_actions/_cache/load-data";

export async function staticBuildersAction() {
    return await _cache(
        "builders",
        async () => {
            const _data = await prisma.builders.findMany({
                select: {
                    id: true,
                    name: true,
                },
            });
            return _data;
        },
        "builders",
    );
}
