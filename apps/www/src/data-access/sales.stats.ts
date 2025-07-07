"use server";

import { statStatus } from "@/app/(clean-code)/(sales)/_common/utils/sales-utils";
import {
    SalesStatStatus,
    TypedSalesStat,
} from "@/app/(clean-code)/(sales)/types";
import { composeSalesStatKeyValue } from "@/data/compose-sales";
import { prisma } from "@/db";
import { sum } from "@/lib/utils";

export async function updateSalesStat(id) {
    const data = await prisma.salesOrders.findUnique({
        where: { id },
        select: {
            id: true,
            stat: true,
            isDyke: true,
            itemDeliveries: {
                select: { deletedAt: true, qty: true },
            },
            items: {
                select: {
                    deletedAt: true,
                    qty: true,
                    dykeProduction: true,
                    swing: true,
                },
            },
            deliveredAt: true,
            doors: {
                select: { deletedAt: true, lhQty: true, rhQty: true },
            },
            assignments: {
                select: {
                    deletedAt: true,
                    qtyAssigned: true,
                    qtyCompleted: true,
                    submissions: {
                        select: { deletedAt: true, qty: true },
                    },
                },
            },
        },
    });
    if (!data) throw new Error("Sales not found");
    // production
    let totalQty = sum(
        data.isDyke
            ? [
                  ...data.doors?.map((d) => sum([d.lhQty, d.rhQty])),
                  ...data.items
                      .filter((i) => i.dykeProduction)
                      .map((s) => s.qty),
              ]
            : data.items.filter((a) => a.swing).map((a) => a.qty)
    );
    const statkv = composeSalesStatKeyValue(data.stat);
    await saveStat({
        type: "prodCompleted",
        salesId: data.id,
        total: totalQty,
        score: sum(
            data.assignments
                .filter((s) => !s.deletedAt)
                .map((a) =>
                    sum(
                        a.submissions
                            .filter((s) => !s.deletedAt)
                            .map((s) => s.qty)
                    )
                )
        ),
        id: statkv["production"]?.id,
    });
    await saveStat({
        type: "prodAssigned",
        total: totalQty,
        salesId: data.id,
        score: sum(
            data.assignments
                .filter((s) => !s.deletedAt)
                .map((s) => s.qtyAssigned)
        ),
    });
    await saveStat({
        type: "dispatchCompleted",
        total: totalQty,
        salesId: data.id,
        score: data.deliveredAt
            ? totalQty
            : sum(
                  data.itemDeliveries
                      .filter((s) => !s.deletedAt)
                      .map((s) => s.qty)
              ),
    });
}

export async function saveStat(data: Partial<TypedSalesStat>) {
    const { id, salesId, ...rest } = data;
    rest.percentage = (rest.score / rest.total) * 100 || 0;
    data.status = statStatus(rest as any).status;
    // if (id)
    //     await prisma.salesStat.update({
    //         where: { id },
    //         data: rest,
    //     });
    // else
    //     await prisma.salesStat.create({
    //         data: {
    //             ...rest,
    //             salesId,
    //         } as any,
    //     });
}
