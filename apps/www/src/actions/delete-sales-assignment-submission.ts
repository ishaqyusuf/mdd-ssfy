"use server";

import { Prisma, prisma } from "@/db";
import { resetSalesAction } from "@sales/sales-control/actions";
import { syncInventoryProductionLifecycleForSale } from "@sales/exports";
import z from "zod";

import { actionClient } from "./safe-action";
import { deleteSalesAssignmentSubmissionSchema } from "./schema";

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
            payroll: {
                select: {
                    id: true,
                    status: true,
                },
            },
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
            await deleteSalesAssignmentSubmission(input, tx);
            await resetSalesAction(tx as any, input.salesId);
            return {};
        });
        await syncInventoryProductionLifecycleForSale(
            prisma as any,
            input.salesId,
        );
        return resp;
    });
