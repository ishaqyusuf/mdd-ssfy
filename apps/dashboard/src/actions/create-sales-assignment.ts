"use server";

import { authId } from "@/app-deps/(v1)/_actions/utils";
import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import { resetSalesAction } from "@sales/sales-control/actions";
import { syncInventoryProductionLifecycleForSale } from "@sales/exports";
import z from "zod";

import { actionClient } from "./safe-action";
import { createAssignmentSchema } from "./schema";

async function createSalesAssignment(
    data: z.infer<typeof createAssignmentSchema>,
    tx: typeof prisma = prisma,
) {
    const assignment = await tx.orderItemProductionAssignments.create({
        data: {
            laborCost: data.unitLabor,
            shelfItem: data.shelfItemId
                ? {
                      connect: {
                          id: data.shelfItemId,
                      },
                  }
                : undefined,
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
                      connect: { id: +data.assignedToId },
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
                    uid: data.itemUid,
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
        // if (input.assignedToId) input.assignedToId = +input.assignedToId;
        return _createSalesAssignmentAction(input);
    });
const _createSalesAssignmentAction = async (input) => {
    const resp = await prisma.$transaction(async (tx: typeof prisma) => {
        const assignment = await createSalesAssignment(input, tx);
        await resetSalesAction(tx as any, input.salesId);
        return {
            assignmentId: assignment.id,
        };
    });
    await syncInventoryProductionLifecycleForSale(prisma as any, input.salesId);
    return resp;
};
