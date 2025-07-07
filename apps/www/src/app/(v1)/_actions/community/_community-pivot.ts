"use server";

import { prisma } from "@/db";
import { getPivotModel } from "@/lib/community/community-utils";
import { ICommunityCosts } from "@/types/community";

export async function _bootstrapPivot() {
    return;
    // await prisma.communityModelPivot.deleteMany({});
    // await prisma.communityModelCost.updateMany({
    //     data: {
    //         pivotId: null
    //     }
    // });
    // await prisma.communityModels.updateMany({
    //     data: {
    //         pivotId: null
    //     }
    // });
    const costs = await prisma.communityModelCost.findMany({
        where: {
            pivotId: null,
            community: {
                isNot: null
            }
        },
        include: {
            community: true
        }
    });
    console.log(costs.length);

    let data: {
        [id in string]: {
            costs: ICommunityCosts[];
            pivotModel;
            costIds: number[];
            projectId?;
        };
    } = {
        // deletes: []
    };
    let deletes: any = [];
    costs.map(cost => {
        const pivotM = getPivotModel(cost.community?.modelName);
        // console.log(pivotM);
        const node = `${pivotM} ${cost.community?.projectId}`;
        if (!data[node]) {
            data[node] = {
                costs: [],
                costIds: [],
                pivotModel: pivotM,
                projectId: cost.community?.projectId
            };
            console.log(cost.community);
        }
        if (
            !data?.[node]?.costs?.some(
                s => cost.startDate == s.startDate && cost.endDate == s.endDate
            )
        ) {
            data?.[node]?.costs?.push(cost as any);
            data?.[node]?.costIds.push(cost.id);
        } else {
            console.log(cost.id);
            deletes.push(cost as any);
        }
    });
    // console.log(data);
    // return;
    let total = Object.keys(data).length;
    console.log("total", total);
    let _count = Object.keys(data).filter((d, i) => i < 10);
    await Promise.all(
        Object.entries(data).map(async ([k, v]) => {
            if (!_count.includes(k)) return;
            let communityIds = v.costs.map(c => c.communityModelId);
            communityIds = communityIds.filter(
                (_, i) => communityIds.findIndex(ci => ci == _) == i
            );

            const pivot = await prisma.communityModelPivot.create({
                data: {
                    model: v.pivotModel,
                    projectId: v.projectId,
                    meta: {},
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            await prisma.communityModelCost.updateMany({
                where: {
                    id: {
                        in: v.costIds
                    }
                },
                data: {
                    pivotId: pivot.id
                }
            });
            await prisma.communityModels.updateMany({
                where: {
                    id: {
                        in: communityIds as any
                    }
                },
                data: {
                    pivotId: pivot.id
                }
            });
        })
    );
}
export async function _attachUnitsToCommunity() {
    const templates = await prisma.communityModels.findMany({
        select: {
            projectId: true,
            modelName: true,
            id: true
        }
    });
    console.log();
}
export async function _createMissingPivots() {
    await Promise.all(
        (
            await prisma.communityModels.findMany({
                where: {
                    pivot: {
                        is: null
                    }
                }
            })
        ).map(async p => {
            const pivotM = getPivotModel(p.modelName);
            let pivot = await prisma.communityModelPivot.findFirst({
                where: {
                    model: pivotM,
                    projectId: p.projectId
                }
            });
            if (!pivot) {
                pivot = await prisma.communityModelPivot.create({
                    data: {
                        model: pivotM,
                        projectId: p.projectId,
                        meta: {},
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
            }
            await prisma.communityModels.update({
                where: { id: p.id },
                data: {
                    pivotId: pivot.id
                }
            });
        })
    );
}
export async function _addMissingPivotToModelCosts() {
    const p = await prisma.communityModelCost.findMany({
        where: {
            pivotId: null,
            community: {
                isNot: null
            }
        },
        include: {
            community: {
                select: {
                    pivotId: true
                }
            }
        }
    });
    const __: any = {};
    p.map(pp => {
        const pid = pp.community?.pivotId;
        if (pid) {
            if (!__[pid?.toString()]) __[pid?.toString()] = [];
            __[pid?.toString()].push(pp.id);
        }
    });
    await Promise.all(
        Object.entries(__).map(async ([k, v]) => {
            await prisma.communityModelCost.updateMany({
                where: {
                    id: {
                        in: v as any
                    }
                },
                data: {
                    pivotId: Number(k)
                }
            });
        })
    );
}
