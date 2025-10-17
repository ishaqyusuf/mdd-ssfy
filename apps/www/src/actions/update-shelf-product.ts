"use server";

import { prisma } from "@/db";
import { Tags } from "@/utils/constants";
import { revalidateTag } from "next/cache";

interface Props {
    unitPrice?: number;
    title?: string;
    img?: string;
}
export async function updateShelfItemAction(id, data: Props) {
    await prisma.dykeShelfProducts.update({
        where: {
            id,
        },
        data: {
            unitPrice: Number.isInteger(data.unitPrice)
                ? data.unitPrice
                : undefined,
            title: data.title || undefined,
            img: data.img || undefined,
        },
    });
    revalidateTag(Tags.shelfProducts);
}
