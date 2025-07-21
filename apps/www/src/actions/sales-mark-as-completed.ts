import { authUser } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { QtyControlType } from "@gnd/utils/sales";
import { updateSalesStatAction } from "./update-sales-stat";

export async function markSalesAsComplete(id) {
    const authorName = (await authUser()).name;
    await prisma.qtyControl.updateMany({
        where: {
            type: {
                in: [`dispatchCompleted`, `prodCompleted`] as QtyControlType[],
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
        types: ["dispatchCompleted", "prodCompleted"],
    });
    // authorName
}

