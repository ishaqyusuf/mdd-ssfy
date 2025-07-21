"use server";

import { revalidatePath } from "next/cache";
import { prisma, Prisma } from "@/db";
import {
    calculateCommunitModelCost,
    getPivotModel,
    getTwinModelName,
} from "@/lib/community/community-utils";
import { formatDate } from "@/lib/use-day";
import { transformData } from "@/lib/utils";
import { ICommunityCosts, ICostChart } from "@/types/community";
import dayjs from "dayjs";

import { _revalidate } from "../_revalidate";
import { fixDbTime } from "../action-utils";

export async function _importModelCostData(
    id,
    modelName,
    builderId,
    meta,
    builderTasks,
) {
    const template = await prisma.homeTemplates.findFirst({
        where: {
            modelName,
            builderId,
        },
        include: {
            costs: true,
        },
    });
    if (template && template.costs.length) {
        await prisma.communityModelCost.deleteMany({
            where: {
                communityModelId: id,
            },
        });
        const _comm = await prisma.communityModels.update({
            where: { id },
            data: {
                costs: {
                    createMany: {
                        data: template.costs.map((cost) => ({
                            model: cost.model,
                            title: cost.title,
                            type: cost.type,
                            meta: calculateCommunitModelCost(
                                cost.meta,
                                builderTasks,
                            ) as any,
                            createdAt: cost.createdAt,
                            updatedAt: cost.updatedAt,
                            current: cost.current,
                            endDate: cost.endDate,
                            startDate: cost.startDate,
                        })),
                    },
                },
            },
            include: {
                costs: true,
            },
        });
        revalidatePath("/settings/community/community-templates", "page");
        return _comm;
        // const _costs = await prisma.communityModelCost.createMany({
        //     data: template.costs.map(cost => ({
        //         model: cost.model,
        //         title: cost.title,
        //         type: cost.type,
        //         meta: cost.meta as any,
        //         createdAt: cost.createdAt,
        //         updatedAt: cost.updatedAt,
        //         current: cost.current,
        //         communityModelId: id,
        //         endDate: cost.endDate,
        //         startDate: cost.startDate
        //     }))
        // });
        // return template;
    }
    return null;
}

export async function _saveCommunitModelCostData(
    cost: ICommunityCosts,
    _communityModelId,
    pivotId,
    includeCompletedTasks = false,
) {
    let { id: _id, communityModelId, pivotId: _pivotId, ..._cost } = cost;
    if (!_pivotId)
        _pivotId = await _findOrGeneratePivotForCommunity(_communityModelId);
    let _c: ICostChart & {
        community: ICommunityCosts;
    } = null as any;
    const title = [
        cost?.startDate ? formatDate(cost?.startDate, "MM/DD/YY") : null,
        cost?.endDate ? formatDate(cost?.endDate, "MM/DD/YY") : "To Date",
    ].join(" - ");
    _cost.title = title;
    _cost.current = cost.endDate
        ? dayjs(cost.endDate).diff(dayjs(), "days") > 0
        : true;
    // _cost.model =
    if (!_id) {
        _c = (await prisma.communityModelCost.create({
            data: transformData({
                ..._cost,
                type: "task-costs",
                pivot: {
                    connect: {
                        id: pivotId,
                    },
                },
                community: {
                    connect: {
                        id: _communityModelId,
                    },
                },
                meta: _cost.meta as any,
            }),
            include: {
                community: true,
            },
        })) as any;
    } else {
        _c = (await prisma.communityModelCost.update({
            where: {
                id: _id,
            },
            data: {
                ...(_cost as any),
            },
            include: {
                community: true,
            },
        })) as any;
    }
    await _attachedUnitsToCommunity(pivotId);
    await _synchronizeModelCost(_c, pivotId);
    _revalidate("communityTemplates");
    return _c;
}
export async function _attachedUnitsToCommunity(pivotId) {
    const pivot = await prisma.communityModelPivot.findUnique({
        where: {
            id: pivotId,
        },
        include: {
            communityModels: true,
        },
    });
    if (pivot) {
        await Promise.all(
            pivot.communityModels.map(async (model) => {
                await prisma.homes.updateMany({
                    where: {
                        projectId: model.projectId,
                        modelName: model.modelName,
                    },
                    data: {
                        communityTemplateId: model.id,
                    },
                });
            }),
        );
    }
}
export async function _findOrGeneratePivotForCommunity(id) {
    const c = await prisma.communityModels.findUnique({ where: { id } });
    if (!c) return null;
    if (c?.pivotId) return c.pivotId;
    const pivotM = getPivotModel(c?.modelName);

    const pivot = await prisma.communityModelPivot.findFirst({
        where: {
            model: pivotM,
            projectId: c.id,
        },
    });
    if (pivot) {
        await prisma.communityModels.update({
            where: { id },
            data: {
                pivot: {
                    connect: {
                        id: pivot.id,
                    },
                },
            },
        });
        return pivot.id;
    }
    return null;
}
export async function _synchronizeModelCost(_c, pivotId) {
    await Promise.all(
        Object.entries(_c.meta.sumCosts).map(async ([k, v]) => {
            const { startDate: from, endDate: to } = _c;
            const whereHomTasks: Prisma.HomeTasksWhereInput = {
                home: {
                    // communityTemplateId: templateId,
                    communityTemplate: {
                        pivotId,
                    },
                    createdAt: {
                        gte: fixDbTime(dayjs(from)).toISOString(),
                        lte: !to
                            ? undefined
                            : fixDbTime(dayjs(to), 23, 59, 59).toISOString(),
                    },
                },
                taskUid: k,
            };
            // if (!includeCompletedTasks)
            //    whereHomTasks.status = {
            //         not: "Completed"
            //     };
            const s = await prisma.homeTasks.updateMany({
                where: whereHomTasks,
                data: {
                    amountDue: Number(v) || 0,
                    updatedAt: new Date(),
                },
            });
        }),
    );
}
export async function _deleteCommunityModelCost(id) {
    if (!id) return;
    await prisma.communityModelCost.delete({
        where: { id },
    });
    _revalidate("communityTemplates");
}
