"use server";

import { prisma } from "@/db";
import { formatMoney } from "@/lib/use-number";
import { sum } from "@/lib/utils";
import { resetSalesAction } from "@sales/sales-control/actions";
import z from "zod";

import { createPayrollAction } from "./create-payroll";
import { actionClient } from "./safe-action";
import { createSubmissionSchema } from "./schema";

export async function submitSalesAssignment(
    data: z.infer<typeof createSubmissionSchema>,
    tx: typeof prisma = prisma,
) {
    const submission = await tx.orderProductionSubmissions.create({
        data: {
            qty: data.qty.qty,
            lhQty: data.qty.lh,
            rhQty: data.qty.rh,
            submittedBy: {
                connect: {
                    id: data.submittedById,
                },
            },
            assignment: {
                connect: {
                    id: data.assignmentId,
                },
            },
            note: data.note,
            meta: {},
            order: {
                connect: {
                    id: data.salesId,
                },
            },
            item: {
                connect: {
                    id: data.itemId,
                },
            },
        },
        select: {
            id: true,
            assignment: {
                select: {
                    laborCost: true,
                    assignedToId: true,
                    itemControl: {
                        // select: {},
                    },
                },
            },
        },
    });
    if (submission.assignment.laborCost && submission.assignment.assignedToId) {
        await createPayrollAction({
            wage: formatMoney(submission.assignment.laborCost * data.qty.qty),
            orderId: data.salesId,
            userId: submission.assignment.assignedToId,
        });
    }
    return submission;
}
export const submitSalesAssignmentAction = actionClient
    .schema(createSubmissionSchema)
    .metadata({
        name: "submit-sales-assignment",
        track: {},
    })
    .action(async ({ parsedInput: input }) => {
        if (!input.qty.qty) input.qty.qty = sum([input.qty.lh, input.qty.rh]);
        const resp = await prisma.$transaction(async (tx: typeof prisma) => {
            const submission = await submitSalesAssignment(input, tx);
            await resetSalesAction(tx as any, input.salesId);
            return {
                submissionId: submission.id,
            };
        });
        return resp;
    });
