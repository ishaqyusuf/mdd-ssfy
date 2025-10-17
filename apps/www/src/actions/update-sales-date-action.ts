"use server";

import { prisma } from "@/db";
import { actionClient } from "./safe-action";
import { z } from "zod";
import { calculatePaymentDueDate } from "@/app/(clean-code)/(sales)/_common/utils/sales-utils";
import { SalesType } from "@/app/(clean-code)/(sales)/types";

export const updateSalesDateAction = actionClient
    .schema(
        z.object({
            id: z.number(),
            newDate: z.date(),
        })
    )
    .action(async ({ parsedInput: { id, newDate } }) => {
        const sale = await prisma.salesOrders.findFirstOrThrow({
            where: {
                id,
            },
            select: {
                createdAt: true,
                paymentDueDate: true,
                type: true,
                paymentTerm: true,
            },
        });
        let type: SalesType = sale.type as any;
        const paymentDueDate =
            type == "quote"
                ? sale.paymentDueDate
                : calculatePaymentDueDate(sale.paymentTerm, newDate);
        await prisma.salesOrders.update({
            where: {
                id,
            },
            data: {
                createdAt: newDate,
                paymentDueDate,
            },
        });
    });
