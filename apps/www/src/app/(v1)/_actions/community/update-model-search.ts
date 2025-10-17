"use server";

import { prisma } from "@/db";

export async function _updateModelSearch(updates) {
    await Promise.all(
        updates.map(async update => {
            await prisma.homes.update({
                where: {
                    id: update.id
                },
                data: {
                    search: update.search
                }
            });
        })
    );
}
