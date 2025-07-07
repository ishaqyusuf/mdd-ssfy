"use server";

import { userId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";

export async function _saveEmailPersonalizeForm(meta) {
    await prisma.users.update({
        where: { id: await userId() },
        data: {
            meta,
            updatedAt: new Date(),
        },
    });
    // revalidatePath("/settings/email");
}
