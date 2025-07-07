"use server";

import { prisma } from "@/db";
import { percent, sum } from "@/lib/utils";

import { QtyControlType } from "../../types";
import { updateSalesItemControlAction } from "./item-control.action";

export async function validateSalesStatControlAction(salesId) {
    const order = await prisma.salesOrders.findFirstOrThrow({
        where: { id: salesId },
        select: {
            itemControls: {
                select: {
                    qtyControls: {
                        select: {
                            type: true,
                        },
                    },
                },
            },
        },
    });
    const qtyControls = order.itemControls
        .map((i) => i.qtyControls)
        .flat().length;
    if (!qtyControls) {
        await resetSalesStatAction(salesId);
    }
}
export async function updateSalesStatControlAction(salesId) {
    const order = await prisma.salesOrders.findFirstOrThrow({
        where: {
            id: salesId,
        },
        select: {
            stat: true,
            itemControls: {
                where: {
                    deletedAt: null,
                },
                select: {
                    produceable: true,
                    shippable: true,
                    qtyControls: true,
                },
            },
        },
    });

    const qtyControls = order.itemControls
        .map((a) =>
            a.qtyControls.map((c) => ({
                ...c,
                produceable: a.produceable,
                shippable: a.shippable,
                type: c.type as QtyControlType,
            })),
        )
        .flat();

    const totalProduceable = sum(
        qtyControls.filter((t) => t.produceable && t.type == "prodAssigned"),
        "itemTotal",
    );
    const totalShippable = sum(
        qtyControls.filter((t) => t.shippable && t.type == "dispatchAssigned"),
        "itemTotal",
    );

    async function createStat(type: QtyControlType, total) {
        const score = sum(
            qtyControls.filter((a) => a.type == type),
            "total",
        );
        const percentage = percent(score, total);
        await prisma.salesStat.upsert({
            where: {
                salesId_type: {
                    type,
                    salesId,
                },
            },
            create: {
                type,
                salesId,
                percentage,
                score,
                total,
            },
            update: {
                percentage,
                score,
                total,
            },
        });
    }
    await createStat("dispatchAssigned", totalShippable);
    await createStat("dispatchCompleted", totalShippable);
    await createStat("dispatchInProgress", totalShippable);
    await createStat("prodAssigned", totalProduceable);
    await createStat("prodCompleted", totalProduceable);
}
export async function resetSalesStatAction(salesId) {
    await updateSalesItemControlAction(salesId);
    await updateSalesStatControlAction(salesId);
}
