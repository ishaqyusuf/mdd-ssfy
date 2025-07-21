"use server";

import { updateSalesProgressDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-progress.dta";
import { userId } from "@/app/(v1)/_actions/utils";
import { OrderItemProductionAssignments, prisma } from "@/db";
import { math, sum } from "@/lib/utils";

export async function createProdAssignment(
    data: Partial<OrderItemProductionAssignments>[],
    // productionStatusId,
    allQty,
    prodDueDate,
) {
    const assignedById = await userId();
    let score = 0;

    await prisma.orderItemProductionAssignments.createMany({
        data: data.map((d) => {
            d.assignedById = assignedById;
            d.qtyAssigned = sum([d.lhQty, d.rhQty]);
            d.qtyCompleted = 0;
            score += d.qtyAssigned || 0;
            d.dueDate = prodDueDate;
            return d;
        }) as any,
    });
    await updateSalesProgressDta(data[0].orderId, "prodAssigned", {
        plusScore: score,
    });

    // if (!productionStatusId) {
    //     // await prisma.salesProductionStatus.create({
    //     //     data: {
    //     //         orderId: data?.[0]?.orderId as any,
    //     //         score: 0,
    //     //         status: ``,
    //     //         total: allQty,
    //     //     },
    //     // });
    // }
    // TODO: Notify new production assigned
}
