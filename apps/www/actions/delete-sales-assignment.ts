"use server";

import { prisma } from "@/db";
import { negativeQty } from "@/utils/sales-control-util";
import z from "zod";

import { actionClient } from "./safe-action";
import { updateSalesItemStats } from "./update-sales-item-stat";
import { updateSalesStatAction } from "./update-sales-stat";

export const deleteSalesAssignmentSchema = z.object({
    assignmentId: z.number(),
});
export async function deleteSalesAssignment(
    data: z.infer<typeof deleteSalesAssignmentSchema>,
    tx: typeof prisma = prisma,
) {
    const assignment = await tx.orderItemProductionAssignments.update({
        where: {
            id: data.assignmentId,
        },
        data: {
            deletedAt: new Date(0),
        },
        select: {
            orderId: true,
            salesItemControlUid: true,
            lhQty: true,
            rhQty: true,
            qtyAssigned: true,
        },
    });
    return assignment;
}
export const deleteSalesAssignmentAction = actionClient
    .schema(deleteSalesAssignmentSchema)
    .metadata({
        name: "delete-sales-assignment",
        track: {},
    })
    .action(async ({ parsedInput: input }) => {
        const resp = await prisma.$transaction(async (tx: typeof prisma) => {
            const assignment = await deleteSalesAssignment(input, tx);
            await updateSalesItemStats({
                uid: assignment.salesItemControlUid,
                salesId: assignment.orderId,
                type: "prodAssigned",
                qty: negativeQty({
                    lh: assignment.lhQty,
                    rh: assignment.rhQty,
                    qty: assignment.qtyAssigned,
                }),
            });
            await updateSalesStatAction(
                {
                    salesId: assignment.orderId,
                    types: ["prodAssigned"],
                },
                tx,
            );
        });
        return resp;
    });
