"use server";

import { db } from "@gnd/db";

export async function updateCommunityVersion(id, version) {
    await db.communityModels.update({
        where: { id },
        data: {
            version,
        },
    });
}
