"use server";

import { userId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import z from "zod";

import { actionClient } from "./safe-action";
import { createSalesDispatchSchema } from "./schema";

export async function createSalesDispatch(
    data: z.infer<typeof createSalesDispatchSchema>,
    tx = prisma,
) {
    const dispatch = await prisma.orderDelivery.create({
        data: {
            deliveryMode: data.deliveryMode,
            status: data.status,
            createdBy: {
                connect: {
                    id: await userId(),
                },
            },
            order: {
                connect: {
                    id: data.orderId,
                },
            },
        },
    });
}

export const createSalesDispatchAction = actionClient
    .schema(createSalesDispatchSchema)
    .metadata({
        name: "create-sales-dispatch",
    })
    .action(async ({ parsedInput: input }) => {
        const resp = await prisma.$transaction(async (tx: typeof prisma) => {});
    });
