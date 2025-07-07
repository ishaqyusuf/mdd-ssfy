"use server";

import { authId } from "@/app/(v1)/_actions/utils";
import { prisma, Prisma } from "@/db";
import { sum } from "@/lib/utils";

import { getItemControlAction } from "../item-control.action";
import {
    assignAllPendingToProductionAction,
    completeAllProductionsAction,
} from "../production-actions/batch-action";
import { getSalesAssignmentsByUidAction } from "../production-actions/item-assignments-action";
import { resetSalesStatAction } from "../sales-stat-control.action";

export interface CreateSalesDispatchData {
    items: {
        uid: string;
        rh: number;
        lh: number;
        qty: number;
        dispatchItemId?: number;
        produceable: boolean;
    }[];
    deliveryMode;
    driverId;
    status;
    salesId;
}
export async function createSalesDispatchAction(data: CreateSalesDispatchData) {
    return await prisma.$transaction((async (tx: typeof prisma) => {
        // const tx = prisma;
        const { deliveryMode, salesId, driverId, status } = data;
        console.log(">>>>");
        const dispatch = await tx.orderDelivery.create({
            data: {
                deliveryMode,
                createdBy: { connect: { id: await authId() } },
                driver: !driverId ? undefined : { connect: { id: driverId } },
                status,
                meta: {},
                order: { connect: { id: salesId } },
            },
        });
        console.log("CREATED!");
        // return dispatch;
        const dispatchables = (
            await Promise.all(
                data.items.map(async (item) => {
                    const dispatchables = await getItemDispatchableSubmissions(
                        item,
                        salesId,
                    );
                    if (!dispatchables?.length)
                        throw new Error("Insufficient submissions");
                    return dispatchables.map((d) => ({
                        ...d,
                        orderDeliveryId: dispatch.id,
                        orderId: salesId,
                        meta: {},
                    }));
                }),
            )
        )?.flat();
        console.log("LCOAACLLCA");
        if (!dispatchables?.length)
            throw new Error(
                "Unable to create dispatch due to missing submissions",
            );
        // console.log(dispatchables);
        const resp = await tx.orderItemDelivery.createMany({
            data: dispatchables as any,
        });
    }) as any);
}
async function getItemDispatchableSubmissions(
    item: CreateSalesDispatchData["items"][number],
    salesId,
) {
    const cuid = item.uid;
    //

    if (!item.produceable) {
        await assignAllPendingToProductionAction(
            {
                salesId,
                submit: true,
                controlIds: [cuid],
            },
            item.produceable,
        );
    }
    const control = await getItemControlAction(cuid);
    const { uidObj, assignments } = await getSalesAssignmentsByUidAction(cuid);
    // find submittables
    console.log(item);

    let obj = {
        pendingQty: { ...item },
        deliveryItems: [] as Partial<Prisma.OrderItemDeliveryCreateManyInput>[],
        // assignments: {}
    };

    //
    ["lh", "rh", "qty"].map(async (k, i) => {
        const qtyAssKey = i == 2 ? `qtyAssigned` : `${k}Qty`;
        const qtySubKey = i == 2 ? `qty` : `${k}Qty`;
        let stats = {
            assigned: 0,
            delivered: 0,
            submitted: 0,
            availableSubmissions: [] as { submissionId; qty }[],
            submittables: [],
            assignables: [],
            deliveryQty: item[k],
        };
        let assigmentList = assignments.filter((a) => a?.[qtyAssKey] > 0);
        if (k == "lh") console.log(assigmentList);

        assigmentList?.map((a) => {
            if (!stats.deliveryQty) return;
            if (i == 2 && (a.lhQty || a.rhQty)) return;
            const assignedQty = sum([a[qtyAssKey]]);
            stats.assigned += assignedQty;
            let submittedQties = 0;
            a.submissions.map((s) => {
                if (!stats.deliveryQty) return;
                const submitQty = sum([s?.[qtySubKey]]);
                submittedQties += submitQty;
                stats.submitted += submitQty;
                let submitDeliveredQty = sum(
                    s.itemDeliveries.map((d) => {
                        const sdq = sum([d?.[qtySubKey]]);
                        stats.delivered += sdq;
                        return sdq;
                    }),
                );
                let pendingSubmitDeliveryQty = sum([
                    submitQty,
                    -1 * submitDeliveredQty,
                ]);
                let deliverable =
                    pendingSubmitDeliveryQty >= stats.deliveryQty
                        ? stats.deliveryQty
                        : sum([
                              stats.deliveryQty,
                              -1 * pendingSubmitDeliveryQty,
                          ]);
                if (deliverable > 0) {
                    stats.deliveryQty -= deliverable;
                    obj.deliveryItems.push({
                        [qtySubKey]: deliverable,
                        orderProductionSubmissionId: s.id,
                        orderItemId: a.itemId,
                    });
                }
            });
            if (stats.deliveryQty > 0 && assignedQty > submittedQties) {
                // TODO: "FINISH SOME ASSIGNMENTS TO MAKE SUBMISSION AVAILABLE FOR DISPATCH"
                console.log("..");
            }
        });
        console.log(stats.deliveryQty);

        if (stats.deliveryQty) {
            throw new Error("Not enough submitted qty");
        }
    });
    console.log(obj.deliveryItems);

    return obj.deliveryItems;
}
