"use server";

import { prisma } from "@/db";
import { authId } from "@/app-deps/(v1)/_actions/utils";
import { reconcileSalesHandoffAfterCommit } from "@api/db/queries/sales-handoff-actions";
import { resetSalesAction } from "@sales/sales-control/actions";
import { syncInventoryProductionLifecycleForSale } from "@sales/exports";
import z from "zod";

import { actionClient } from "./safe-action";

const deleteSalesAssignmentSchema = z.object({
    assignmentId: z.number(),
    itemUid: z.string(),
});
async function deleteSalesAssignment(
    data: z.infer<typeof deleteSalesAssignmentSchema>,
    tx: typeof prisma = prisma,
) {
    const assignment = await tx.orderItemProductionAssignments.update({
        where: {
            id: data.assignmentId,
        },
        data: {
            deletedAt: new Date(),
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
            await resetSalesAction(tx as any, assignment.orderId);
            return {
                salesId: assignment.orderId,
            };
        });
	        if (resp?.salesId) {
            await syncInventoryProductionLifecycleForSale(
                prisma as any,
                resp.salesId,
	            );
			await reconcileSalesHandoffAfterCommit(prisma, {
				salesOrderIds: [resp.salesId],
				actorUserId: await authId(),
				source: "dashboard.production.delete-assignment",
			});
	        }
        return resp;
    });
