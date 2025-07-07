"use server";

import { prisma, Prisma } from "@/db";
import { generateRandomString } from "@/lib/utils";

export async function updateSalesTaxProfileAction(
    taxCode,
    data: Prisma.TaxesUpdateInput,
) {
    const r = await prisma.taxes.update({
        where: {
            taxCode,
        },
        data,
    });
    return r;
}
export async function createSalesTaxProfileAction(
    data: Prisma.TaxesCreateManyInput,
) {
    const res = await prisma.taxes.create({
        data: {
            ...data,
            taxCode: generateRandomString(5),
        },
    });
    return res;
}
