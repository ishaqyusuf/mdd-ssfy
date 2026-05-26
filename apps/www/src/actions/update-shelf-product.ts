"use server";

import { prisma } from "@/db";
import { Tags } from "@/utils/constants";
import { revalidateTag } from "next/cache";

interface Props {
    unitPrice?: number;
    title?: string;
    img?: string;
    enabled?: boolean;
}
export async function updateShelfItemAction(id, data: Props) {
    await prisma.dykeShelfProducts.update({
        where: {
            id,
        },
        data: {
            unitPrice:
                data.unitPrice != null &&
                Number.isFinite(Number(data.unitPrice))
                    ? Number(data.unitPrice)
                    : undefined,
            title: data.title || undefined,
            img: data.img || undefined,
            deletedAt:
                typeof data.enabled === "boolean"
                    ? data.enabled
                        ? null
                        : new Date()
                    : undefined,
        },
    });
    revalidateTag(Tags.shelfProducts, "max");
}
