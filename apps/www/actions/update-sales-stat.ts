import { QtyControlType } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { percent, sum } from "@/lib/utils";

interface Props {
    types: QtyControlType[];
    salesId: number;
}
export async function updateSalesStatAction(
    props: Props,
    tx: typeof prisma = prisma,
) {
    const sale = await tx.salesOrders.findUnique({
        where: {
            id: props.salesId,
        },
        include: {
            stat: {
                where: {
                    deletedAt: null,
                    type: {
                        in: props.types,
                    },
                },
            },
            itemControls: {
                select: {
                    qtyControls: {
                        where: {
                            type: {
                                in: props.types,
                            },
                        },
                    },
                    shippable: true,
                    produceable: true,
                },
            },
        },
    });
    await Promise.all(
        sale.stat.map(async (stat) => {
            const qtyControls = sale.itemControls
                .filter((a) => {
                    const type = stat.type as QtyControlType;
                    switch (type) {
                        case "prodAssigned":
                        case "prodCompleted":
                            return a.produceable;
                    }
                    return true;
                })
                .map((a) =>
                    a.qtyControls
                        .map((q) => ({
                            ...a,
                            ...q,
                        }))
                        .filter((a) => a.type == stat.type),
                )
                .flat();

            let total = sum(qtyControls, "itemTotal");
            let qty = sum(qtyControls, "qty");
            let percentage = percent(qty, total);
            await tx.salesStat.update({
                where: {
                    salesId_type: {
                        salesId: props.salesId,
                        type: stat.type,
                    },
                },
                data: {
                    score: qty,
                    percentage,
                    total,
                },
            });
        }),
    );
}
