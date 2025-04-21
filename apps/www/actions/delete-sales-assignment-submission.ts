"use server";

import { Prisma, prisma } from "@/db";
import {
    negativeQty,
    qtyMatrixSum,
    transformQtyHandle,
} from "@/utils/sales-control-util";
import z from "zod";

import { actionClient } from "./safe-action";
import { deleteSalesAssignmentSubmissionSchema } from "./schema";
import { updateSalesItemStats } from "./update-sales-item-stat";
import { updateSalesStatAction } from "./update-sales-stat";

export async function deleteSalesAssignmentSubmission(
    data: z.infer<typeof deleteSalesAssignmentSubmissionSchema>,
    tx: typeof prisma = prisma,
) {
    const whereQueries: Prisma.OrderProductionSubmissionsWhereInput[] = [];
    if (data.submissionId)
        whereQueries.push({
            id: data.submissionId,
        });
    else {
        if (data.assignmentId)
            whereQueries.push({
                assignmentId: data.assignmentId,
            });
    }
    const where =
        whereQueries.length > 0
            ? {
                  OR: whereQueries,
              }
            : whereQueries[0];
    const resp = await tx.orderProductionSubmissions.findMany({
        where,
        select: {
            id: true,
            qty: true,
            lhQty: true,
            rhQty: true,
            assignment: {
                select: {
                    id: true,
                    salesItemControlUid: true,
                    qtyAssigned: true,
                    lhQty: true,
                    rhQty: true,
                },
            },
        },
    });
    await tx.orderProductionSubmissions.updateMany({
        where,
        data: {
            deletedAt: new Date(),
        },
    });
    return resp;
}
export const deleteSalesAssignmentSubmissionAction = actionClient
    .schema(deleteSalesAssignmentSubmissionSchema)
    .metadata({
        name: "delete-sales-assignment-submission",
        track: {},
    })
    .action(async ({ parsedInput: input }) => {
        const resp = await prisma.$transaction(async (tx: typeof prisma) => {
            const submissions = await deleteSalesAssignmentSubmission(
                input,
                tx,
            );

            await Promise.all(
                submissions.map(async (item, index) => {
                    let commonItems = submissions.filter(
                        (i) => i.assignment.id == item.assignment?.id,
                    );
                    const assignment = commonItems?.[0]?.assignment;
                    if (item.id != commonItems[0]?.id) return;

                    // const itemUid = item.assignment.salesItemControlUid;
                    let submitQty = qtyMatrixSum(
                        ...commonItems.map(transformQtyHandle),
                    );
                    if (submitQty?.qty > assignment.qtyAssigned)
                        submitQty = {
                            lh: assignment.lhQty,
                            rh: assignment.rhQty,
                            qty: assignment.qtyAssigned,
                        };
                    await updateSalesItemStats(
                        {
                            uid: input.itemUid,
                            salesId: input.salesId,
                            type: "prodCompleted",
                            qty: negativeQty(submitQty),
                        },
                        tx,
                    );
                }),
            );
            await updateSalesStatAction(
                {
                    salesId: input.salesId,
                    types: ["prodCompleted"],
                },
                tx,
            );
            return {};
        });
        return resp;
    });
