"use server";

import { prisma } from "@/db";
import { IBuilder } from "@/types/community";
import { composeBuilderTasks } from "../compose-builder-tasks";

export async function _getBuilderHomeIds(builderId) {
    const homeIds = await prisma.homes.findMany({
        where: {
            builderId,
        },
        select: {
            id: true,
        },
    });
    return homeIds;
}
export async function _syncBuilderTasks(
    data: IBuilder,
    deleteIds,
    newTaskIds,
    unitIds
) {
    const taskNames: any = [];

    // const unitIds = units.findMany(({ id }) => id);
    await Promise.all(
        data.meta.tasks.map(async (p) => {
            await prisma.homeTasks.updateMany({
                where: {
                    home: {
                        id: {
                            in: unitIds,
                        },
                    },
                    taskUid: p.uid,
                    deletedAt: {},
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
                    deletedAt: null,
                },
            });
        })
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
            (t) => !home.tasks.some((s) => s.taskUid == t.uid)
        );
        if (bTasks.length) {
            tasks.push(
                ...composeBuilderTasks(bTasks, [
                    {
                        projectId: home.projectId,
                        homeId: home.id,
                        search: home.search,
                    },
                ])
            );
        }
    });
    // console.log(tasks.length);
    // await Promise.all
    await prisma.homeTasks.createMany({
        data: tasks,
    });
}
