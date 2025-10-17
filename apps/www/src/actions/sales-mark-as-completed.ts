"use server";
import { authUser } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { QtyControlType } from "@gnd/utils/sales";
import { updateSalesStatAction } from "./update-sales-stat";
import { createNoteAction } from "@/modules/notes/actions/create-note-action";
import { createSalesDispatch } from "./create-sales-dispatch-action";
import { SalesDispatchStatus } from "@api/type";

export async function markSalesDispatchAsComplete(id) {
    const authorName = (await authUser()).name;
    const order = await prisma.salesOrders.findUnique({
        where: {
            id,
        },
        select: {
            deliveryOption: true,
            deliveries: {
                where: {
                    deletedAt: null,
                    status: {
                        not: {
                            in: [
                                "cancelled",
                                "completed",
                            ] as SalesDispatchStatus[],
                        },
                    },
                },
                select: {
                    id: true,
                    status: true,
                },
            },
        },
    });
    const delivery = order?.deliveries?.[0];
    if (!delivery) {
        const d = await createSalesDispatch({
            deliveryMode: order?.deliveryOption as any,
            orderId: id,
        });
    }
    await markSalesAsCompleted(id, ["prodCompleted", "dispatchCompleted"]);
    await createNoteAction({
        type: "dispatch",
        note: `Dispatch marked as completed by ${authorName}`,
        headline: `Dispatch complete`,
        tags: [
            {
                tagName: "salesId",
                tagValue: String(id),
            },
        ],
    });
    await prisma.orderDelivery.updateMany({
        where: {
            salesOrderId: id,
            status: {
                not: {
                    in: ["cancelled"] as SalesDispatchStatus[],
                },
            },
        },
        data: {
            status: "completed" as SalesDispatchStatus,
        },
    });
    return order;
}
export async function markSalesProductionAsCompleted(id) {
    const authorName = (await authUser()).name;
    await markSalesAsCompleted(id, ["prodCompleted"]);
    await createNoteAction({
        type: "production",
        note: `Production marked as completed by ${authorName}`,
        headline: `Production complete`,
        tags: [
            {
                tagName: "salesId",
                tagValue: String(id),
            },
        ],
    });
}
async function markSalesAsCompleted(id, types: QtyControlType[]) {
    await prisma.qtyControl.updateMany({
        where: {
            type: {
                in: types,
            },
            itemControl: {
                salesId: id,
            },
        },
        data: {
            autoComplete: true,
        },
    });
    await updateSalesStatAction({
        salesId: id,
        types,
    });
    // authorName
}

