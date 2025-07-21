"use server";

import { revalidatePath } from "next/cache";
import { prisma, Prisma } from "@/db";
import { whereQuery } from "@/lib/db-utils";
import { removeEmptyValues, transformData } from "@/lib/utils";
import { BaseQuery } from "@/types/action";
import { HomeTemplateMeta, ICommunityTemplateMeta } from "@/types/community";
import slugify from "slugify";

import { getPageInfo, queryFilter } from "../../../../_actions/action-utils";
import { userId } from "../../../../_actions/utils";

export interface HomeTemplatesQueryParams extends BaseQuery {}
export type GetHomeTemplates = Awaited<ReturnType<typeof getHomeTemplates>>;
export async function getHomeTemplates(query: HomeTemplatesQueryParams) {
    const where = whereHomeTemplate(query);
    const _items = await prisma.homeTemplates.findMany({
        where,
        include: {
            builder: true,
            costs: {
                orderBy: {
                    title: "desc",
                    // createdAt: "desc"
                },
            },

            // _count: {
            //   // homes: true,
            // },
        },

        ...(await queryFilter(query)),
    });
    const pageInfo = await getPageInfo(query, where, prisma.homeTemplates);

    return {
        pageInfo,
        data: _items as any,
    };
}
export async function getCommunityTemplates(query: HomeTemplatesQueryParams) {
    const where = whereCommunityTemplate(query);
    // where.deletedAt = {
    //     not: null,
    // };
    const _items = await prisma.communityModels.findMany({
        where,
        include: {
            project: {
                select: {
                    title: true,
                    meta: true,
                    builderId: true,
                    builder: {
                        select: {
                            name: true,
                            meta: true,
                        },
                    },
                },
            },
            pivot: {
                include: {
                    modelCosts: true,
                    _count: {
                        select: {
                            modelCosts: true,
                        },
                    },
                },
            },
            costs: true,
            // builder: true,
            _count: {
                select: {
                    homes: true,
                    // piv: true
                },
            },
        },
        ...(await queryFilter(query)),
    });
    const pageInfo = await getPageInfo(query, where, prisma.communityModels);

    return {
        pageInfo,
        data: _items as any,
    };
}
function whereCommunityTemplate(query: HomeTemplatesQueryParams) {
    const q = {
        contains: query._q || undefined,
    };
    const where = whereQuery<Prisma.CommunityModelsWhereInput>(query);
    where.searchQuery("modelName");
    where.search({
        project: { title: where.q },
    });
    where.orWhere("projectId", +query._projectId);
    if (query._builderId)
        where.raw({
            project: {
                builderId: +query._builderId,
            },
        });
    return where.get();
    // const where: Prisma.CommunityModelsWhereInput = {
    //   modelName: q,
    //   project: { title: q },
    // };

    return where;
}
function whereHomeTemplate(query: HomeTemplatesQueryParams) {
    const q = {
        contains: query._q || undefined,
    };
    const where: Prisma.HomeTemplatesWhereInput = {
        modelName: q as any,

        // builderId: {
        //   equals: Number(query._builderId) || undefined,
        // },
    };

    return where;
}
export async function printHomesAction(
    homes: { builderId: number; projectId: number; modelName }[],
) {
    const prints = await prisma.homeTemplates.findMany({
        where: {
            OR: homes.map(({ builderId, modelName }) => {
                const w: Prisma.HomeTemplatesWhereInput = {
                    builderId,
                    modelName,
                };
                return w;
            }),
        },
    });
    const communityPrints = await prisma.communityModels.findMany({
        where: {
            OR: homes.map(({ projectId, modelName }) => {
                const w: Prisma.CommunityModelsWhereInput = {
                    projectId,
                    modelName,
                };
                return w;
            }),
        },
    });

    return { prints, communityPrints };
}
export async function getHomeTemplate(slug) {
    const homeTemplate = await prisma.homeTemplates.findUnique({
        where: { slug },
    });
    if (!homeTemplate) throw new Error("Home template not found");
    return homeTemplate;
}
export type GetCommunityTemplate = Awaited<
    ReturnType<typeof getCommunityTemplate>
>;
export async function getCommunityTemplate(slug) {
    const homeTemplate = await prisma.communityModels.findUnique({
        where: { slug },
        include: {
            history: true,
        },
    });
    if (!homeTemplate) throw new Error("Home template not found");
    return {
        ...homeTemplate,
        meta: homeTemplate.meta as any as HomeTemplateMeta,
    };
}
export async function saveHomeTemplateDesign(slug, meta) {
    await prisma.homeTemplates.update({
        where: { slug },
        data: {
            ...transformData({}, true),
            meta: removeEmptyValues(meta) as any,
        },
    });
}
export async function saveCommunityTemplateDesign(slug, _meta) {
    let meta = removeEmptyValues(_meta) as ICommunityTemplateMeta;
    // meta.design

    await prisma.communityModels.update({
        where: {
            slug,
        },
        data: {
            ...transformData({}, true),
            meta: meta as any,
            history: {
                create: {
                    createdAt: new Date(),
                    meta: {
                        design: meta.design,
                    } as any,
                    updatedAt: new Date(),
                    userId: await userId(),
                },
            },
        },
    });
}
export async function deleteHomeTemplateAction(id) {}

export async function _createModelTemplate(data, builderName) {
    const slug = slugify(`${builderName} ${data.modelName}`);

    await prisma.homeTemplates.create({
        data: {
            // slug: slugify(data.modelName)
            ...data,
            ...transformData({}),
        },
    });
    revalidatePath("/settings/community/model-templates", "page");
}
