"use server";

import { authId } from "@/app-deps/(v1)/_actions/utils";
import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import { syncInventoryProductionLifecycleForSale } from "@sales/exports";
import { updateQtyControlAction } from "../item-control.action";
import {
    resetSalesStatAction,
    updateSalesStatControlAction,
} from "../sales-stat-control.action";
import { itemControlUidObject } from "../../utils/item-control-utils";
import { _notify } from "@/app-deps/(v1)/_actions/notifications";
import { submitProductionAssignment } from "@sales/production-submission-review";
import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";

export async function createItemAssignmentAction({
    salesItemId,
    assignedToId = null,
    doorId = null,
    salesId,
    lh,
    rh,
    qty,
    dueDate = null,
    uid,
    totalQty,
    produceable,
}) {
    const obj = itemControlUidObject(uid);
    doorId = obj.doorId;
	const assignmentId = (await prisma.$transaction((async (
		tx: typeof prisma,
	) => {
        const assignment = await tx.orderItemProductionAssignments.create({
            data: {
                salesDoor: doorId
                    ? {
                          connect: { id: doorId },
                      }
                    : undefined,
                order: {
                    connect: { id: salesId },
                },
                lhQty: sum([lh]),
                rhQty: sum([rh]),
                qtyAssigned: qty ? sum([qty]) : sum([lh, rh]),
                assignedTo: assignedToId
                    ? {
                          connect: { id: assignedToId },
                      }
                    : undefined,
                item: {
                    connect: { id: salesItemId },
                },
                dueDate,
                assignedBy: {
                    connect: {
                        id: await authId(),
                    },
                },
            },
        });
        // await _notify(
        //     assignedToId,
        //     "assign production",
        //     `New Production Assigned`,
        //     null,
        //     ``
        // );
        if (produceable) {
            await updateQtyControlAction(uid, "prodAssigned", {
                totalQty,
                qty,
                rh,
                lh,
            });
            await updateSalesStatControlAction(salesId);
        }
        return assignment.id;
    }) as any)) as any;
    return assignmentId;
}
export async function deleteItemAssignmentAction({ id }) {
	const salesId = await prisma.$transaction(async (tx) => {
		const a = await tx.orderItemProductionAssignments.update({
            where: {
                id,
            },
            data: {
                deletedAt: new Date(),
                submissions: {
                    updateMany: {
                        where: {},
                        data: {
                            deletedAt: new Date(),
                        },
                    },
                },
            },
        });
		await tx.orderItemDelivery.updateMany({
            where: {
                submission: {
                    assignment: {
                        id,
                    },
                },
            },
            data: {
                deletedAt: new Date(),
            },
        });
        await resetSalesStatAction(a.orderId);
        return a.orderId;
	});
    await syncInventoryProductionLifecycleForSale(prisma as any, salesId);
}
export async function submitItemAssignmentAction({
    uid,
    totalQty,
    qty,
    rh,
    lh,
    salesId,
    assignmentId,
    salesItemId,
    produceable,
	idempotencyKey,
}) {
	const actor = await getLoggedInProfile();
	if (!actor.userId) throw new Error("Authentication is required.");
	return submitProductionAssignment(prisma as any, {
		salesOrderId: salesId,
		salesOrderItemId: salesItemId,
		assignmentId,
		submittedById: actor.userId,
		idempotencyKey:
			idempotencyKey ||
			`legacy-production:${salesId}:${assignmentId}:${actor.userId}`,
		qty,
                lhQty: lh,
                rhQty: rh,
		allowSubmitForOthers: Boolean(actor.can?.editProduction),
            });
}
export async function updateAssignmentDueDateAction(assignmentId, dueDate) {
    await prisma.orderItemProductionAssignments.update({
        where: {
            id: assignmentId,
        },
        data: {
            dueDate,
        },
    });
}
export async function updateAssignmentAssignedToAction(
    assignmentId,
	assignedToId,
) {
    await prisma.orderItemProductionAssignments.update({
        where: {
            id: assignmentId,
        },
        data: {
            assignedToId,
        },
    });
}
export async function deleteSubmissionAction({ id }) {
	const salesId = await prisma.$transaction(async (tx) => {
        const resp = await tx.orderProductionSubmissions.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
        await resetSalesStatAction(resp.salesOrderId);
        return resp.salesOrderId;
	});
    await syncInventoryProductionLifecycleForSale(prisma as any, salesId);
}
