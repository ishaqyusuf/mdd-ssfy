"use server";

import { prisma } from "@/db";
import z from "zod";

import { createSiteActionTicket } from "./create-site-action-ticket";
import { actionClient } from "./safe-action";
import { updateSalesDueAmount } from "./update-sales-due-amount";
import { SalesPaymentStatus } from "@/app/(clean-code)/(sales)/types";
import { SquarePaymentStatus } from "@/_v2/lib/square";
import { authUser } from "@/app/(v1)/_actions/utils";

const schema = z.object({
    customerTransactionId: z.number(),
    reason: z.string().optional(),
});
export const cancelSalesPaymentAction = actionClient
    .schema(schema)
    .metadata({
        name: "cancel-sales-payment",
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
                    status: "CANCELED" as SquarePaymentStatus,
                    statusNote: input.reason,
                    history: {
                        create: {
                            status: "CANCELED",
                            description: input.reason,
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
                    await createSiteActionTicket({
                        type: "sales-payment",
                        event: "cancelled",
                        meta: {
                            id: sp.id,
                        },
                    });
                }),
            );
        });
    });
