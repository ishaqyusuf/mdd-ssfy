"use server";

import { prisma } from "@/db";
import { authId } from "@/app-deps/(v1)/_actions/utils";
import { reconcileSalesHandoffAfterCommit } from "@api/db/queries/sales-handoff-actions";
import { Notifications } from "@gnd/notifications";
import { resetSalesAction } from "@sales/sales-control/actions";
import { syncInventoryProductionLifecycleForSale } from "@sales/exports";
import z from "zod";

import { actionClient } from "./safe-action";
import { getLoggedInProfile } from "./cache/get-loggedin-profile";
import { requireProductionAssignmentAuthority } from "./production-submission-authority";

const deleteSalesAssignmentSchema = z.object({
    assignmentId: z.number(),
    salesId: z.number(),
    itemUid: z.string(),
});
async function deleteSalesAssignment(
    data: z.infer<typeof deleteSalesAssignmentSchema>,
    tx: typeof prisma = prisma,
) {
    const assignment = await tx.orderItemProductionAssignments.update({
        where: {
            id: data.assignmentId,
            orderId: data.salesId,
            salesItemControlUid: data.itemUid,
            deletedAt: null,
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
            assignedToId: true,
            order: {
                select: {
                    orderId: true,
                },
            },
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
        const actor = await getLoggedInProfile();
        if (!actor.userId) throw new Error("Authentication is required.");
        requireProductionAssignmentAuthority(actor);
        const actorId = actor.userId;
        const resp = await prisma.$transaction(async (tx: typeof prisma) => {
            const assignment = await deleteSalesAssignment(input, tx);
            await resetSalesAction(tx as any, assignment.orderId);
            return {
                salesId: assignment.orderId,
                assignmentId: input.assignmentId,
                assignedToId: assignment.assignedToId,
                assignedQty:
                    assignment.qtyAssigned ||
                    Number(assignment.lhQty || 0) +
                        Number(assignment.rhQty || 0),
                orderNo: assignment.order.orderId || undefined,
            };
        });
	        if (resp?.salesId) {
            await syncInventoryProductionLifecycleForSale(
                prisma as any,
                resp.salesId,
	            );
			await reconcileSalesHandoffAfterCommit(prisma, {
				salesOrderIds: [resp.salesId],
				actorUserId: actorId,
				source: "dashboard.production.delete-assignment",
			});
	        }
        if (resp?.assignedToId) {
            try {
                await new Notifications(prisma).create(
                    "sales_production_unassigned",
                    {
                        salesId: resp.salesId,
                        orderNo: resp.orderNo,
                        assignmentId: resp.assignmentId,
                        assignedToId: resp.assignedToId,
                        assignedQty: resp.assignedQty || undefined,
                    },
                    {
                        author: { id: actorId, role: "employee" },
                        recipients: [
                            { ids: [resp.assignedToId], role: "employee" },
                        ],
                        includeChannelSubscribers: false,
                        allowFallbackRecipient: false,
                        forceInAppRecipients: true,
                    },
                );
            } catch (error) {
                console.warn(
                    "Production assignment was deleted, but its notification failed.",
                    { assignmentId: resp.assignmentId, error },
                );
            }
        }
        return resp;
    });
