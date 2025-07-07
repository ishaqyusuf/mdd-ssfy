"use server";

import { revalidatePath } from "next/cache";
import { composeBuilderTasks } from "@/app/(v2)/(loggedIn)/community-settings/builders/compose-builder-tasks";
import { prisma, Prisma } from "@/db";
import { transformData } from "@/lib/utils";
import { BaseQuery } from "@/types/action";
import { IBuilder, IBuilderTasks, IHomeTask } from "@/types/community";
import slugify from "slugify";

import { _cache } from "../../../../_actions/_cache/load-data";
import { getPageInfo, queryFilter } from "../../../../_actions/action-utils";

export interface BuildersQueryParams extends BaseQuery {}
export async function getBuildersAction(query: BuildersQueryParams) {
    const where = whereBuilder(query);
    const _items = await prisma.builders.findMany({
        where,
        include: {
            _count: {
                select: {
                    projects: true,
                },
            },
            //  builder: true,
        },
        ...(await queryFilter(query)),
    });
    const pageInfo = await getPageInfo(query, where, prisma.builders);

    return {
        pageInfo,
        data: _items as any,
    };
}
function whereBuilder(query: BuildersQueryParams) {
    const q = {
        contains: query._q || undefined,
    };
    const where: Prisma.BuildersWhereInput = {
        // builderId: {
        //   equals: Number(query._builderId) || undefined,
        // },
    };

    return where;
}
export async function staticBuildersAction() {
    return await _cache(
        "builders",
        async () => {
            const _data = await prisma.builders.findMany({
                select: {
                    id: true,
                    name: true,
                },
            });
            return _data;
        },
        "builders",
    );
}
export async function deleteBuilderAction(id) {}
export async function saveBuilder(data: IBuilder) {
    if (
        (await prisma.builders.count({
            where: { name: data.name },
        })) > 0
    )
        throw new Error("Builder name already exists");
    await prisma.builders.create({
        data: {
            name: data.name,
            meta: data.meta as any,
            slug: slugify(data.name),
        },
    });
}
export async function saveBuilderTasks(data: IBuilder, deleteIds, newTaskIds) {
    await prisma.builders.update({
        where: {
            id: data.id,
        },
        data: {
            meta: data.meta as any,
        },
    });

    const taskNames: any = [];
    await Promise.all(
        data.meta.tasks.map(async (p) => {
            await prisma.homeTasks.updateMany({
                where: {
                    home: {
                        builderId: data.id,
                    },
                    taskUid: p.uid,
                    // taskName: {
                    //     not: p.name
                    // }
                },

                data: {
                    taskName: p.name,
                    billable: p.billable,
                    produceable: p.produceable,
                    addon: p.addon,
                    installable: p.installable,
                    deco: p.deco,
                    punchout: p.punchout,
                },
            });
        }),
    );
    if (deleteIds?.length)
        await prisma.homeTasks.deleteMany({
            where: {
                taskUid: {
                    in: deleteIds,
                },
                home: {
                    installedAt: null,
                },
                // prodStartedAt: null,
            },
        });

    if (newTaskIds) {
        // let tasks
        let homes = await prisma.homes.findMany({
            where: {
                builderId: data.id,
            },
            select: {
                id: true,
                projectId: true,
                search: true,
                jobs: {
                    select: {
                        id: true,
                    },
                },
            },
        });
        const taskData = homes
            .map((h) =>
                // !h.jobs.length &&
                ({
                    projectId: h.projectId,
                    homeId: h.id,
                    search: h.search,
                }),
            )
            .filter(Boolean);
        await composeBuilderTasks(
            data.meta.tasks.filter((t) => newTaskIds.includes(t.uid)),
            taskData as any,
        );
    }
    const homes = await prisma.homes.findMany({
        where: {
            builderId: data.id,
        },
        select: {
            id: true,
            projectId: true,
            search: true,
            tasks: {
                select: {
                    id: true,
                    taskUid: true,
                },
            },
        },
    });
    // console.log(homes.length);
    let tasks: any[] = [];
    homes.map((home) => {
        let bTasks = data.meta.tasks.filter(
            (t) => !home.tasks.some((s) => s.taskUid == t.uid),
        );
        if (bTasks.length) {
            tasks.push(
                ...composeBuilderTasks(bTasks, [
                    {
                        projectId: home.projectId,
                        homeId: home.id,
                        search: home.search,
                    },
                ]),
            );
        }
    });
    // console.log(tasks.length);
    // await Promise.all
    await prisma.homeTasks.createMany({
        data: tasks,
    });
    revalidatePath("/settings/community/builders", "page");
}
export async function deleteBuilderTasks({ builderId, taskIds }) {}
export async function addBuilderTasks({ builderId, tasksIds, tasks }) {}
export async function saveBuilderInstallations(data: IBuilder) {}
