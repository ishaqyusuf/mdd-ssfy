"use server";

import { prisma } from "@/db";
import z from "zod";

import { createSiteActionTicket } from "./create-site-action-ticket";
import { actionClient } from "./safe-action";
import { updateSalesDueAmount } from "./update-sales-due-amount";
import { SalesPaymentStatus } from "@/app/(clean-code)/(sales)/types";
import { authUser } from "@/app/(v1)/_actions/utils";
import { deleteSalesCommission } from "./delete-payroll";
import { revalidatePath } from "next/cache";
import { createResolution } from "./create-resolution";

const __schema = z.object({
    customerTransactionId: z.number(),
    reason: z.string().optional(),
    action: z.string().optional(),
    note: z.string().optional(),
});
export const resolvePaymentAction = actionClient
    .schema(__schema)
    .metadata({
        name: "resolve-payment-action",
        track: {},
    })
    .action(async ({ parsedInput: { customerTransactionId, ...input } }) => {
        return await prisma.$transaction(async (prisma) => {
            const author = await authUser();
            const tx = await prisma.customerTransaction.update({
                where: {
                    id: customerTransactionId,
                },
                data: {
                    status: "CANCELED" as any,
                    statusNote: input.note,
                    statusReason: input.reason,
                    history: {
                        create: {
                            status: "CANCELED",
                            description: input.note,
                            reason: input.reason,
                            authorId: author.id,
                            authorName: author.name,
                        },
                    },
                    salesPayments: {
                        updateMany: {
                            where: {
                                deletedAt: null,
                            },
                            data: {
                                status: "cancelled" as SalesPaymentStatus,
                            },
                        },
                    },
                },
                select: {
                    salesPayments: {
                        select: {
                            orderId: true,
                            id: true,
                        },
                    },
                },
            });
            await Promise.all(
                tx.salesPayments.map(async (sp) => {
                    await updateSalesDueAmount(sp?.orderId, prisma);
                    await deleteSalesCommission(sp?.id);
                    await createSiteActionTicket({
                        type: "sales-payment",
                        event: "cancelled",
                        meta: {
                            id: sp.id,
                        },
                    });
                    await createResolution({
                        action: input.action as any,
                        reason: input.reason as any,
                        salesId: sp?.orderId,
                    });
                }),
            );
            revalidatePath("/sales-rep");
            revalidatePath("/sales-book/accounting/resolution-center");
        });
    });
