"use server";

import { prisma } from "@/db";
import { getSalesItemsOverviewAction } from "../sales-items-action";
import { qtyControlDifference } from "../../utils/sales-utils";
import {
    createItemAssignmentAction,
    submitItemAssignmentAction,
} from "./item-assign-action";
import { sum } from "@/lib/utils";

interface AssignAllPendingToProductionAction {
    controlIds?: string[];
    salesId;
    assignedToId?;
    dueDate?;
    submit?: boolean;
}
export async function assignAllPendingToProductionAction(
    props: AssignAllPendingToProductionAction,
    produceable
) {
    return await prisma.$transaction((async (tx: typeof prisma) => {
        const overview = await getSalesItemsOverviewAction({
            salesId: props.salesId,
            adminMode: true,
        });
        return await Promise.all(
            overview.items
                .filter((item) =>
                    props.controlIds?.length
                        ? props.controlIds?.includes(item.itemControlUid)
                        : true
                )
                .map(async (item) => {
                    const qty = item.status.qty;
                    const assigned = item.status.prodAssigned;
                    const pending = qtyControlDifference(qty, assigned);
                    if (pending.total) {
                        const assignmentId = await createItemAssignmentAction({
                            salesItemId: item.itemId,
                            salesId: props.salesId,
                            doorId: item.doorId,
                            uid: item.itemControlUid,
                            rh: pending.rh,
                            lh: pending.lh,
                            qty: pending.qty,
                            totalQty: qty.total,
                            produceable,
                            assignedToId: props.assignedToId,
                        });
                        if (props.submit)
                            await submitItemAssignmentAction({
                                salesItemId: item.itemId,
                                salesId: props.salesId,
                                // doorId: item.doorId,
                                uid: item.itemControlUid,
                                rh: pending.rh,
                                lh: pending.lh,
                                qty: pending.qty,
                                totalQty: qty.total,
                                assignmentId,
                                produceable,
                            });
                    }
                })
        );
    }) as any);
}
interface CompleteAllProductionsAction
    extends AssignAllPendingToProductionAction {
    // controlIds?: string[];
    // salesId;
    includingUnassigned?: boolean;
}
export async function completeAllProductionsAction(
    props: CompleteAllProductionsAction,
    produceable
) {
    return await prisma.$transaction((async (tx: typeof prisma) => {
        if (props.includingUnassigned)
            await assignAllPendingToProductionAction(
                {
                    ...props,
                    submit: true,
                },
                produceable
            );
        const overview = await getSalesItemsOverviewAction({
            salesId: props.salesId,
            adminMode: true,
        });
        await Promise.all(
            overview.items
                .filter((item) =>
                    props.controlIds?.length
                        ? props.controlIds?.includes(item.itemControlUid)
                        : true
                )
                .map(async (item) => {
                    const { prodAssigned, prodCompleted, qty } = item.status;
                    const pending = qtyControlDifference(
                        prodAssigned,
                        prodCompleted
                    );
                    const ls = item.assignments.map((a) => ({
                        assignmentId: a.id,
                        pendingSubmissions: a.pendingSubmission,
                    }));
                    await Promise.all(
                        ls.map(async (l) => {
                            // if(l.pendingSubmissions.)
                            const { rh, lh, qty } = l.pendingSubmissions;
                            const total = sum([rh, lh, qty]);
                            if (total > 0) {
                                await submitItemAssignmentAction({
                                    salesItemId: item.itemId,
                                    salesId: item.doorId,
                                    uid: item.itemControlUid,
                                    rh: rh,
                                    lh: lh,
                                    qty: qty,
                                    totalQty: total,
                                    assignmentId: l.assignmentId,
                                    produceable,
                                });
                            }
                        })
                    );
                })
        );
    }) as any);
}
