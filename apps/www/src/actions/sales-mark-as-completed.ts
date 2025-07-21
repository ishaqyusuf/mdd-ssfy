"use server";
import { authUser } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { QtyControlType } from "@gnd/utils/sales";
import { updateSalesStatAction } from "./update-sales-stat";
import { createNoteAction } from "@/modules/notes/actions/create-note-action";

export async function markSalesDispatchAsComplete(id) {
    const authorName = (await authUser()).name;
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

