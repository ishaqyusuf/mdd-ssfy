"use server";

import { prisma } from "@/db";
import { sum } from "@/lib/utils";

export async function getAssignmentCompleteDateList() {
    const a = await prisma.orderItemProductionAssignments.findMany({
        where: {
            completedAt: null,
        },
        select: {
            id: true,
            updatedAt: true,
            lhQty: true,
            rhQty: true,
            qtyAssigned: true,
            qtyCompleted: true,
            submissions: {
                select: {
                    id: true,
                    qty: true,
                },
                where: {
                    deletedAt: null,
                },
            },
        },
    });
    const ls = a
        .map((data) => {
            let qty = data.qtyAssigned;
            let updateData: any = {
                id: data.id,
            };
            if (data.lhQty || data.rhQty)
                if (!qty) {
                    qty = sum([data.lhQty, data.rhQty]);
                    updateData.qtyAssigned = qty;
                }
            let qtyCompleted = sum(data.submissions, "qty");
            if (qtyCompleted != data.qtyCompleted)
                updateData.qtyCompleted = qtyCompleted;
            if (qtyCompleted >= qty)
                updateData.completedAt = data.updatedAt || new Date();
            if (Object.keys(updateData).length > 1) return updateData;
            return null;
        })
        .filter(Boolean);
    return ls;
}

export async function performUpdate(list) {
    await Promise.all(
        list.map(async (data) => {
            const { id, ...update } = data;
            await prisma.orderItemProductionAssignments.update({
                where: {
                    id,
                },
                data: update,
            });
        }),
    );
}
