"use server";

import { QtyControlType } from "@/app/(clean-code)/(sales)/types";
import { Prisma, prisma } from "@/db";
import { percent, sum } from "@/lib/utils";

import { getSalesItemsOverviewAction } from "./get-sales-items-overview-action";

export async function resetSalesStatAction(id, salesNo) {
    return await prisma.$transaction(async (tx) => {
        await tx.qtyControl.deleteMany({
            where: {
                itemControl: {
                    salesId: id,
                },
            },
        });
        await tx.salesStat.deleteMany({
            where: {
                salesId: id,
            },
        });

        const overview = await getSalesItemsOverviewAction(salesNo);
        let qc: Prisma.QtyControlCreateManyInput[] = [];
        let salesItemControls: Prisma.SalesItemControlCreateManyInput[] = [];
        overview.items.map((item) => {
            salesItemControls.push({
                uid: item.controlUid,
                produceable: item.itemConfig?.production,
                shippable: item.itemConfig?.shipping,
                orderItemId: item.itemId,
                salesId: overview.orderId,
                title: item.title,
                sectionTitle: item.sectionTitle,
                subtitle: item.subtitle,
            });

            function qtyControlData(
                type: QtyControlType,
                qty,
            ): Prisma.QtyControlCreateManyInput {
                return {
                    type,
                    itemControlUid: item.controlUid,
                    itemTotal: item.qty.qty,
                    lh: qty.lh,
                    rh: qty.rh,
                    qty: qty.qty,
                };
            }
            qc.push(
                ...[
                    qtyControlData("qty", item.qty),
                    qtyControlData(
                        "prodAssigned",
                        item.analytics.stats.prodAssigned,
                    ),
                    qtyControlData(
                        "prodCompleted",
                        item.analytics.stats.prodCompleted,
                    ),
                    qtyControlData(
                        "dispatchAssigned",
                        item.analytics.stats.dispatchAssigned,
                    ),
                    qtyControlData(
                        "dispatchInProgress",
                        item.analytics.stats.dispatchInProgress,
                    ),
                    qtyControlData(
                        "dispatchCancelled",
                        item.analytics.stats.dispatchCancelled,
                    ),
                    qtyControlData(
                        "dispatchCompleted",
                        item.analytics.stats.dispatchCompleted,
                    ),
                ],
            );
        });
        await tx.salesItemControl.deleteMany({
            where: {
                salesId: id,
                uid: {
                    notIn: salesItemControls.map((a) => a.uid),
                },
            },
        });
        await Promise.all(
            salesItemControls.map(async (sic) => {
                await tx.salesItemControl.upsert({
                    where: { uid: sic.uid },
                    create: sic,
                    update: sic,
                });
            }),
        );
        await tx.qtyControl.createMany({
            data: qc.map((d) => ({
                ...d,
                percentage: percent(d.qty, d.itemTotal),
            })),
        });
        const statTypes: QtyControlType[] = [
            "qty",
            "prodAssigned",
            "prodCompleted",
            "dispatchAssigned",
            "dispatchCompleted",
        ];
        await tx.salesStat.createMany({
            data: statTypes.map((type) => {
                const controls = overview.items.map(
                    (i) => i.analytics?.stats?.[type],
                );
                const qties = overview.items
                    .filter((a) => {
                        switch (type) {
                            // case "dispatchCompleted":
                            // return a.itemConfig.shipping;
                            case "prodAssigned":
                            case "prodCompleted":
                                return a.itemConfig.production;
                        }
                        return true;
                    })
                    .map((a) => a.analytics.stats.qty);
                const data = {
                    type,
                    salesId: overview.orderId,
                    score: sum(controls, "qty"),
                    total: sum(qties, "qty"),
                } as Prisma.SalesStatCreateManyInput;
                data.percentage = percent(data.score, data.total);
                return data;
            }),
        });
    });
}
