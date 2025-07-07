"use server";

import { revalidatePath, unstable_noStore } from "next/cache";
import { prisma, Prisma, Projects } from "@/db";
import { slugModel, transformData } from "@/lib/utils";
import { BaseQuery, TableApiResponse } from "@/types/action";
import { IProject, IProjectMeta } from "@/types/community";

import { clearCacheAction } from "../_cache/clear-cache";
import { _cache } from "../_cache/load-data";
import { _revalidate } from "../_revalidate";
import { getPageInfo, queryFilter } from "../action-utils";

export interface ProjectsQueryParams extends BaseQuery {
    _builderId;
}

export async function getProjectsAction(
    query: ProjectsQueryParams,
): TableApiResponse<IProject> {
    const where = whereProject(query);
    const _items = await prisma.projects.findMany({
        where,
        include: {
            _count: {
                select: {
                    homes: true,
                },
            },
            builder: true,
        },
        ...(await queryFilter(query)),
    });
    const pageInfo = await getPageInfo(query, where, prisma.projects);

    return {
        pageInfo,
        data: _items as any,
    };
}

export async function saveProject(project: IProject) {
    project.slug = await slugModel(project.title, prisma.projects);
    const _project = await prisma.projects.create({
        data: transformData(project) as any,
    });
    await clearCacheAction("projects");
    _revalidate("projects");
}
function whereProject(query: ProjectsQueryParams) {
    const q = {
        contains: query._q || undefined,
    };
    const where: Prisma.ProjectsWhereInput = {
        builderId: {
            equals: Number(query._builderId) || undefined,
        },
        title: q as any,
        deletedAt: null,
    };

    return where;
}
export async function staticProjectsAction() {
    unstable_noStore();
    const f = await _cache(
        "project-filter",
        async () => {
            const _data = await prisma.projects.findMany({
                select: {
                    id: true,
                    title: true,
                    builderId: true,
                    meta: true,
                },
                orderBy: {
                    title: "asc",
                },
                where: {
                    deletedAt: null,
                },
            });
            return _data;
        },
        "project-filter",
    );
    // console.log(f);
    return f;
}
export async function updateCommunityCost(id, meta: IProjectMeta) {
    await updateProjectMeta(id, meta);
    revalidatePath("/settings/community/community-costs", "page");
}
export async function updateProjectMeta(id, meta: IProjectMeta) {
    await prisma.projects.update({
        where: {
            id,
        },
        data: {
            meta: meta as any,
        },
    });
    // revalidatePath('')
}
