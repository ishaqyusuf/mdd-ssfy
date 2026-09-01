"use server";

import { authId } from "@/app-deps/(v1)/_actions/utils";
import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import { reconcileSalesHandoffAfterCommit } from "@api/db/queries/sales-handoff-actions";
import { Notifications } from "@gnd/notifications";
import { resetSalesAction } from "@sales/sales-control/actions";
import z from "zod";

import { actionClient } from "./safe-action";
import { createAssignmentSchema } from "./schema";
import { getLoggedInProfile } from "./cache/get-loggedin-profile";
import { requireProductionAssignmentAuthority } from "./production-submission-authority";

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
            assignedAt: data.assignedToId ? new Date() : null,
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
            order: {
                select: {
                    orderId: true,
                },
            },
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
    const actor = await getLoggedInProfile();
    if (!actor.userId) throw new Error("Authentication is required.");
    requireProductionAssignmentAuthority(actor);
    const actorId = actor.userId;
    const resp = await prisma.$transaction(async (tx: typeof prisma) => {
        const assignment = await createSalesAssignment(input, tx);
        await resetSalesAction(tx as any, input.salesId);
        return {
            assignmentId: assignment.id,
            assignedToId: assignment.assignedToId,
            assignedQty:
                assignment.qtyAssigned ||
                Number(assignment.lhQty || 0) + Number(assignment.rhQty || 0),
            dueDate: assignment.dueDate,
            orderNo: assignment.order.orderId || undefined,
        };
	    });
	await reconcileSalesHandoffAfterCommit(prisma, {
		salesOrderIds: [input.salesId],
		actorUserId: actorId,
		source: "dashboard.production.create-assignment",
	});
	if (resp.assignedToId) {
		try {
			await new Notifications(prisma).create(
				"sales_production_assigned",
				{
					salesId: input.salesId,
					orderNo: resp.orderNo,
					assignedToId: resp.assignedToId,
					assignedQty: resp.assignedQty || undefined,
					itemCount: 1,
					dueDate: resp.dueDate || undefined,
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
				"Production assignment was saved, but its notification failed.",
				{ assignmentId: resp.assignmentId, error },
			);
		}
	}
	    return resp;
};
