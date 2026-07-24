"use server";

import type { SalesMeta } from "@/app-deps/(clean-code)/(sales)/types";
import { Prisma, prisma } from "@/db";
import {
    mergeSalesMetaPatch,
    readSalesFormPo,
} from "@gnd/sales/sales-form/application/legacy-metadata";

export async function updateSalesMetaAction(
    id: number,
    metaData: Partial<SalesMeta>,
) {
    const s = await prisma.salesOrders.findFirstOrThrow({
        where: {
            id,
        },
        select: {
            meta: true,
        },
    });
    const meta = mergeSalesMetaPatch(
        (s.meta || {}) as Record<string, unknown>,
        metaData as Record<string, unknown>,
    );
    await prisma.salesOrders.update({
        where: {
            id,
        },
        data: {
            meta: meta as Prisma.InputJsonValue,
        },
    });

    return {
        po: readSalesFormPo(meta),
    };
}
