"use server";

import { unstable_noStore } from "next/cache";
import { prisma } from "@/db";
import { slugModel, transformData } from "@/lib/utils";
import { IProject, IProjectMeta } from "@/types/community";

import { clearCacheAction } from "../_cache/clear-cache";
import { _cache } from "../_cache/load-data";
import { _revalidate } from "../_revalidate";

export async function saveProject(project: IProject) {
    project.slug = await slugModel(project.title, prisma.projects);
    const _project = await prisma.projects.create({
        data: transformData(project) as any,
    });
    await clearCacheAction("projects");
    _revalidate("projects");
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

    return f;
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
