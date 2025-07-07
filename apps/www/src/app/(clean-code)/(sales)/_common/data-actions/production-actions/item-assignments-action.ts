"use server";

import { prisma } from "@/db";
import { itemControlUidObject } from "../../utils/item-control-utils";

export async function getSalesAssignmentsByUidAction(cuid) {
    const uidobjt = itemControlUidObject(cuid);
    const assignments = await prisma.orderItemProductionAssignments.findMany({
        where: {
            OR: [
                {
                    salesItemControlUid: cuid,
                    deletedAt: null,
                },
                {
                    deletedAt: null,
                    salesDoor: uidobjt.doorId
                        ? {
                              dimension: uidobjt.dim || undefined,
                              id: uidobjt.doorId,
                          }
                        : undefined,
                    item: {
                        id: uidobjt.itemId || undefined,
                        housePackageTool: uidobjt.hptId
                            ? {
                                  id: uidobjt.hptId,
                              }
                            : undefined,
                    },
                },
            ],
        },
        select: {
            qtyAssigned: true,
            rhQty: true,
            lhQty: true,
            id: true,
            itemId: true,
            submissions: {
                where: { deletedAt: null },
                select: {
                    id: true,
                    qty: true,
                    rhQty: true,
                    lhQty: true,
                    itemDeliveries: {
                        where: { deletedAt: null },
                        select: {
                            id: true,
                            qty: true,
                            lhQty: true,
                            rhQty: true,
                        },
                    },
                },
            },
        },
    });
    return {
        uidObj: uidobjt,
        assignments,
    };
}
