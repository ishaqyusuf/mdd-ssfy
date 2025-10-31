"use server";

import { prisma, Prisma } from "@/db";

export async function _deleteDykeItem(
    itemId,
    {
        stepFormIds = [],
        shelfIds = [],
        doorsIds = [],
        housePackageIds = [],
        itemIds = [],
    } = {},
) {
    async function _deleteWhere(
        itemId,
        t,
        notIn: number[] = [],
        items = false,
    ) {
        const where: any = items
            ? { id: itemId, deletedAt: null }
            : {
                  salesOrderItem: {
                      id: itemId,
                  },
                  id: {
                      notIn: notIn || [],
                  },
                  deletedAt: null,
              };
        // if (!items)
        //     where.id = {
        //         notIn: notIn || [],
        //     };
        await t.updateMany({
            where,
            data: {
                deletedAt: new Date(),
            },
        });
    }
    // return prisma.$transaction(async (tx) => {
    if (itemId) {
        await _deleteWhere(itemId, prisma.dykeStepForm, stepFormIds);

        await _deleteWhere(itemId, prisma.dykeSalesShelfItem, shelfIds);

        await _deleteWhere(itemId, prisma.dykeSalesDoors, doorsIds);

        await _deleteWhere(itemId, prisma.housePackageTools, housePackageIds);
        await _deleteWhere(itemId, prisma.salesOrderItems, itemIds, true);
    }
    // });
}
