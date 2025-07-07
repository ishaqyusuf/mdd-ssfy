"use server";

import { prisma } from "@/db";
import { revalidatePath } from "next/cache";

export async function saveHousePackageTool(id, meta) {
    await prisma.settings.update({
        where: { id },
        data: {
            meta,
        },
    });
    revalidatePath("/sales-v2/dimension-variants", "page");
}
