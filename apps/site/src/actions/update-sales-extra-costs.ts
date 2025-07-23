"use server";

import { Prisma, prisma } from "@/db";

export async function updateSalesExtraCosts(
    orderId,
    costs: Partial<Prisma.SalesExtraCostsGetPayload<{}>>[],
) {
    if (!orderId) return null;
    await prisma.$transaction(async (tx) => {
        await tx.salesExtraCosts.deleteMany({
            where: {
                orderId,
                id: {
                    notIn: costs
                        .filter((a) => !!a.amount)
                        .map((c) => c.id)
                        .filter(Boolean),
                },
            },
        });
        await tx.salesExtraCosts.createMany({
            data: (costs as any)
                .filter((a) => !a.id && a.amount)
                .map((d) => ({
                    ...d,
                    orderId,
                })),
        });
        await Promise.all(
            costs
                .filter((a) => !!a.id && !!a.amount)
                .map(async (data) => {
                    await tx.salesExtraCosts.update({
                        where: {
                            id: data.id,
                        },
                        data: {
                            ...data,
                            orderId,
                        },
                    });
                }),
        );
    });
}
