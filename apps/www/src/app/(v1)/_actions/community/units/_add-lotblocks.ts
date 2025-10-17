"use server";

import { prisma } from "@/db";

export async function _addLotBlocks() {
    const units = await prisma.homes.findMany({
        where: {
            lotBlock: null
        },
        select: {
            id: true,
            lot: true,
            block: true
        }
    });
    let __: any = {};
    units.map(m => {
        const lblck = [m.lot || "-", m.block || "-"].join("/");
        if (!__[lblck]) __[lblck] = [];
        __[lblck].push(m.id);
    });
    await Promise.all(
        Object.entries(__).map(async ([k, v]) => {
            await prisma.homes.updateMany({
                where: {
                    id: {
                        in: v as any
                    }
                },
                data: {
                    lotBlock: k
                }
            });
        })
    );
}
