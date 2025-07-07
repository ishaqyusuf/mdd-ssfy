"use server";

import { prisma } from "@/db";
import { DykeDoorType } from "../../../type";

export async function bootstrapHousePackageTools() {
    const hpts = await prisma.housePackageTools.findMany({
        where: {
            stepProductId: null,
            OR: [
                {
                    dykeDoorId: {
                        not: null,
                    },
                },
                {
                    moldingId: {
                        not: null,
                    },
                },
            ],
        },
    });
    const isMoulding = (type: DykeDoorType) => type == "Moulding";
    const doorIds = Array.from(
        new Set(
            hpts
                .filter((a) => !isMoulding(a.doorType as any))
                .map((a) => a.dykeDoorId)
                .filter(Boolean)
        )
    );
    const mouldingIds = Array.from(
        new Set(
            hpts
                .filter((a) => isMoulding(a.doorType as any))
                .map((a) => a.moldingId)
                .filter(Boolean)
        )
    );
    const doorsProds = await prisma.dykeStepProducts.findMany({
        where: {
            door: {
                id: {
                    in: doorIds,
                },
            },
        },
    });
    const mouldingProds = await prisma.dykeStepProducts.findMany({
        where: {
            product: {
                id: {
                    in: mouldingIds,
                },
            },
        },
    });
    await Promise.all(
        doorsProds.map(async (d) => {
            const ids = hpts
                .filter(
                    (h) =>
                        d.doorId == h.dykeDoorId &&
                        !isMoulding(h.doorType as any)
                )
                .map((a) => a.id);
            await prisma.housePackageTools.updateMany({
                where: {
                    id: { in: ids },
                },
                data: {
                    stepProductId: d.id,
                    moldingId: null,
                    updatedAt: new Date(),
                },
            });
        })
    );
    await Promise.all(
        mouldingProds.map(async (d) => {
            const ids = hpts
                .filter(
                    (h) =>
                        d.doorId == h.dykeDoorId &&
                        isMoulding(h.doorType as any)
                )
                .map((a) => a.id);
            await prisma.housePackageTools.updateMany({
                where: {
                    id: { in: ids },
                },
                data: {
                    stepProductId: d.id,
                    dykeDoorId: null,
                    updatedAt: new Date(),
                },
            });
        })
    );
    return {
        count: hpts.length,
        _doors: hpts.map((a) => a.doorId),
        _conflicts: hpts
            .filter((h) => h.dykeDoorId && h.moldingId)
            .map((a) => a.doorType),
        moulding: {
            ids: mouldingIds.length,
            prods: mouldingProds.length,
        },
        door: {
            ids: doorIds.length,
            prods: doorsProds.length,
        },
    };
}
export async function bootstrapDykeStepDuplicates() {
    const steps = await prisma.dykeSteps.findMany({});

    let _counts = [];
    steps.map((s, i) => {
        const duplicates = steps.filter((si) => si.title == s.title);
        if (duplicates[0]?.id == s.id) {
            _counts.push({
                title: s.title,
                count: duplicates.length,
                ids: duplicates.map((a) => a.id),
            });
        }
    });
    return { _counts };
}
