"use server";

import { prisma } from "@/db";

export async function hptDoorsAction() {
    const d = await prisma.housePackageTools.findMany({
        where: {
            stepProductId: null,
        },
        select: {
            id: true,
            door: {
                select: {
                    stepProducts: {
                        select: {
                            id: true,
                            uid: true,
                            step: {
                                select: {
                                    title: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    const updates = {};
    const val = d
        .filter((d) => d.door?.stepProducts?.length == 1)
        .map((val) => {
            const ss = {
                id: val.id,
                stepProdId: val.door.stepProducts?.[0]?.id,
            };
            if (!updates[ss.stepProdId]) updates[ss.stepProdId] = [ss.id];
            else updates[ss.stepProdId].push(ss.id);
            return ss;
        });

    return {
        updates: Object.entries(updates).map(([id, ids]) => ({
            id,
            ids,
        })),
    };
}
export async function performUpdate(data) {
    await Promise.all(
        data.map(async (dt) => {
            await prisma.housePackageTools.updateMany({
                where: {
                    id: { in: dt.ids },
                },
                data: {
                    stepProductId: +dt.id,
                },
            });
        })
    );
}
