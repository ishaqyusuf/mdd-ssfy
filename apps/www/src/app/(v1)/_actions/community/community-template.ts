"use server";

import { prisma } from "@/db";
import {
    calculateCommunitModelCost,
    getPivotModel,
} from "@/lib/community/community-utils";
import { ICommunityTemplateMeta, ICostChart } from "@/types/community";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { transformData } from "@/lib/utils";
export async function updateCommunityModelInstallCost(
    id,
    pivotId,
    pivotMeta,
    meta = null
) {
    await prisma.communityModelPivot.update({
        where: { id: pivotId },
        data: {
            meta: pivotMeta as any,
            updatedAt: new Date(),
        },
    });
    if (meta)
        await prisma.communityModels.update({
            where: { id },
            data: {
                meta: meta as any,
                updatedAt: new Date(),
            },
        });
    revalidatePath("/settings/community/community-templates", "page");
}
export async function staticCommunity() {
    return await prisma.communityModels.findMany({
        select: {
            id: true,
            modelName: true,
            projectId: true,
        },
    });
}
export async function _saveCommunityModelCost(
    id,
    meta: ICommunityTemplateMeta
) {
    const community = await prisma.communityModels.update({
        where: { id },
        data: {
            meta: meta as any,
            updatedAt: new Date(),
        },
        include: {
            _count: {
                select: {
                    homes: true,
                },
            },
        },
    });
    // community.
    if (!community._count.homes)
        await prisma.homes.updateMany({
            where: {
                projectId: community.projectId,
                modelName: community.modelName,
            },
            data: {
                communityTemplateId: community.id,
            },
        });
    await Promise.all(
        Object.entries(meta.modelCost.sumCosts).map(async ([k, v]) => {
            await prisma.homeTasks.updateMany({
                where: {
                    taskUid: k,
                    home: {
                        projectId: community.projectId,
                        modelName: community.modelName,
                    },
                },
                data: {
                    // taxCost:
                    amountDue: Number(v) || 0,
                },
            });
        })
    );
    revalidatePath("/settings/community/community-templates", "page");
}
export async function _createCommunityTemplate(data, projectName) {
    const slug = slugify(`${projectName} ${data.modelName}`);
    const pivotM = getPivotModel(data.modelName);
    let pivot = await prisma.communityModelPivot.findFirst({
        where: {
            model: pivotM,
            projectId: data.projectId,
        },
    });
    if (!pivot) {
        pivot = await prisma.communityModelPivot.create({
            data: {
                model: pivotM,
                projectId: data.projectId,
                meta: {},
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }
    const temp = await prisma.communityModels.create({
        data: {
            slug,
            ...data,
            pivotId: pivot.id,
            ...transformData({}),
        },
    });

    await prisma.homes.updateMany({
        where: {
            projectId: temp.projectId,
            modelName: temp.modelName,
        },
        data: {
            communityTemplateId: temp.id,
        },
    });
    revalidatePath("/settings/community/community-templates", "page");
}
export async function _updateCommunityModel(newData, oldData) {
    //
    if (oldData.modelName != newData.modelName) {
        const homes = await prisma.homes.updateMany({
            where: {
                projectId: oldData.projectId,
                modelName: oldData.modelName,
            },
            data: {
                communityTemplateId: newData.id,
                modelName: newData.modelName,
            },
        });
        await prisma.communityModels.update({
            where: {
                id: oldData.id,
            },
            data: {
                modelName: newData.modelName,
            },
        });
        revalidatePath("/settings/community/community-templates", "page");
        // await prisma.$queryRaw`
        //     UPDATE Homes SET search=REPLACE(search,${oldData.modelName},${newData.modelName})
        //     WHERE projectId=${oldData.projectId} AND
        //     modelName=${newData.modelName};
        // `;
        // return await prisma.homes.findMany({
        //     where: {
        //         projectId: oldData.projectId,
        //         modelName: oldData.modelName
        //     }
        // });
    }
}
export async function _importModelCost(
    id,
    modelName,
    builderId,
    meta,
    builderTasks
) {
    const q = modelName
        .toLowerCase()
        .split(" ")
        .filter((v) => ["lh", "rh"].every((sp) => v != sp))
        .filter(Boolean)
        .join(" ");
    // console.log({ builderId, q, modelName });
    const cost: ICostChart = (await prisma.costCharts.findFirst({
        where: {
            template: {
                builderId,
                // modelName: {
                //     contains: q
                // }
            },
            OR: [
                {
                    model: {
                        contains: modelName,
                    },
                },
                {
                    model: q,
                },
            ],
        },
        // include: {
        //     template: {
        //         include: {
        //             builder: true
        //         }
        //     }
        // },
        orderBy: {
            updatedAt: "desc",
        },
    })) as any;
    // console.log(cost);
    if (cost) {
        await _saveCommunityModelCost(id, {
            ...(meta ?? {}),
            modelCost: calculateCommunitModelCost(cost.meta, builderTasks),
        });
        return true;
    }
    return false;
}
export async function _deleteCommunitModel(id) {
    await prisma.homes.updateMany({
        where: {
            communityTemplateId: id,
        },
        data: {
            communityTemplateId: null,
        },
    });
    await prisma.communityModels.update({
        where: {
            id,
        },
        data: {
            deletedAt: new Date(),
            costs: {
                updateMany: {
                    where: {},
                    data: {
                        deletedAt: new Date(),
                    },
                },
            },
        },
        // include: {
        //     costs: true,
        // },
    });
    revalidatePath("/settings/community/community-templates");
}
