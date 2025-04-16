"use server";

import { authId } from "@/app/(v1)/_actions/utils";
import { prisma, Prisma } from "@/db";
import { sum } from "@/lib/utils";
import z from "zod";

import { actionClient } from "./safe-action";
import { createAssignmentSchema } from "./schema";

export async function createSalesAssignment(
    tx: typeof prisma,
    data: z.infer<typeof createAssignmentSchema>,
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
    });
}
export const createSalesAssignmentAction = actionClient
    .schema(createAssignmentSchema)
    .metadata({
        name: "create-sales-assignment",
        track: {},
    })
    .action(async ({ parsedInput: { ...input } }) => {
        const resp = await prisma.$transaction(async (tx: typeof prisma) => {});
        return resp;
    });
