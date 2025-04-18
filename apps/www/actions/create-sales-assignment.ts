"use server";

import { authId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import z from "zod";

import { actionClient } from "./safe-action";
import { createAssignmentSchema } from "./schema";
import { updateSalesItemStats } from "./update-sales-item-stat";
import { updateSalesStatAction } from "./update-sales-stat";

export async function createSalesAssignment(
    data: z.infer<typeof createAssignmentSchema>,
    tx: typeof prisma = prisma,
) {
    const assignment = await tx.orderItemProductionAssignments.create({
        data: {
            salesDoor: data.salesDoorId
                ? {
                      connect: {
                          id: data.salesDoorId,
                      },
                  }
                : undefined,
            order: {
                connect: {
                    id: data.salesId,
                },
            },
            lhQty: data.qty.lh,
            rhQty: data.qty.rh,
            qtyAssigned: data.qty.qty || sum([data.qty.lh, data.qty.rh]),
            assignedTo: data.assignedToId
                ? {
                      connect: { id: data.assignedToId },
                  }
                : undefined,
            dueDate: data.dueDate,
            assignedBy: {
                connect: {
                    id: await authId(),
                },
            },
            item: {
                connect: {
                    id: data.salesItemId,
                },
            },
            itemControl: {
                connect: {
                    uid: "aa",
                },
            },
        },
        include: {
            assignedTo: true,
        },
    });

    return assignment;
}
export const createSalesAssignmentAction = actionClient
    .schema(createAssignmentSchema)
    .metadata({
        name: "create-sales-assignment",
        track: {},
    })
    .action(async ({ parsedInput: input }) => {
        const resp = await prisma.$transaction(async (tx: typeof prisma) => {
            const assignment = await createSalesAssignment(input, tx);
            await updateSalesItemStats({
                uid: input.itemUid,
                salesId: input.salesId,
                type: "prodAssigned",
                itemTotal: input.itemsTotal,
                qty: {
                    ...input.qty,
                },
            });
            await updateSalesStatAction(
                {
                    salesId: input.salesId,
                    types: ["prodAssigned"],
                },
                tx,
            );
            return {
                assignmentId: assignment.id,
            };
        });
        return resp;
    });
