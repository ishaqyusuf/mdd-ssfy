"use server";

import { prisma, Prisma } from "@/db";
import { BaseQuery } from "@/types/action";

import { dateQuery, getPageInfo, queryFilter } from "../action-utils";
import { _fixHomeTaskDates } from "../upgrade/fix-home-task-date";

export interface HomeQueryParams extends BaseQuery {
    _builderId;
    _projectSlug;
    _projectId?;
    _showInvoiceType?: "part paid" | "full paid" | "no payment" | "has payment";
    _production?: "started" | "queued" | "idle" | "completed" | "sort";
    _installation?: "Submitted" | "No Submission";
}
export async function getHomesAction(query: HomeQueryParams) {
    await _fixHomeTaskDates();
    const where = await whereHome(query);
    const homes = await prisma.homes.findMany({
        ...(await queryFilter(query)),
        where,
        include: {
            project: {
                include: {
                    builder: true,
                },
            },
            tasks: {
                select: {
                    taskUid: true,
                    produceable: true,
                    producedAt: true,
                    installable: true,
                    sentToProductionAt: true,
                    amountDue: true,
                    amountPaid: true,
                },
            },
            jobs: {
                select: {
                    id: true,
                    createdAt: true,
                },
            },
        },
    });
    const pageInfo = await getPageInfo(query, where, prisma.homes);
    return {
        pageInfo,
        data: homes,
    };
}
export async function getProjectHomesAction(query: HomeQueryParams) {
    const where = await whereHome(query, true);
    const project = await prisma.projects.findUnique({
        where: {
            slug: query._projectSlug,
        },
        include: {
            builder: true,
            homes: {
                ...(await queryFilter(query)),
                where,
                include: {
                    jobs: {
                        select: {
                            id: true,
                            createdAt: true,
                        },
                    },
                    tasks: {
                        select: {
                            taskUid: true,
                            produceable: true,
                            installable: true,
                            producedAt: true,
                            sentToProductionAt: true,
                        },
                    },
                },
            },
        },
    });
    if (!project) throw new Error("Project Not found");
    const pageInfo = await getPageInfo(
        query,
        await whereHome(query),
        prisma.homes,
    );
    const { homes, ...pdata } = project as any;
    return {
        pageInfo,
        data: homes.map((home) => {
            return {
                ...home,
                project: pdata,
            };
        }),
        project: pdata,
    };
}
export async function deleteHome(id) {
    //delete home along with accessories
    await prisma.homes.delete({
        where: {
            id,
        },
        include: {
            jobs: true,
            tasks: true,
        },
    });
}
export async function whereHome(query: HomeQueryParams, asInclude = false) {
    const q: any = {
        contains: query._q || undefined,
    };
    // if (query._q) q.contains = query._q;

    const where: Prisma.HomesWhereInput = {
        builderId: {
            equals: Number(query._builderId) || undefined,
        },
        // project: {
        //     id: {
        //         gt: 0
        //     }
        // },
        // ...dateQuery(query),
    };
    if (q.contains)
        where.OR = [
            {
                search: q,
            },
            {
                modelName: q,
            },
        ];
    if (!asInclude) {
        if (query._projectSlug) {
            where.project = {
                slug: query._projectSlug,
            };
        }
    }
    if (query._projectId) where.projectId = Number(query._projectId);
    switch (query._production) {
        case "completed":
            break;
        case "idle":
            break;
        case "queued":
            break;
        case "started":
            break;
        case "sort":
            break;
    }
    switch (query._showInvoiceType) {
        case "has payment":
            where.tasks = {
                some: {
                    taskUid: {
                        not: null,
                    },
                    amountPaid: {
                        gt: 0,
                    },
                },
            };
            break;
        case "no payment":
            where.tasks = {
                every: {
                    taskUid: {
                        not: null,
                    },
                    OR: [
                        {
                            amountPaid: {
                                equals: 0,
                            },
                        },
                        {
                            amountPaid: null,
                        },
                        {
                            amountPaid: undefined,
                        },
                    ],
                },
            };
            break;
    }
    if ((query.from && query.to) || query._date) {
        const dq = dateQuery({
            date: query._date,
            ...query,
        })[query._dateType];
        let dateType = query._dateType;
        switch (dateType) {
            case "createdAt":
                where[query._dateType] = dq;
                break;
            default:
                where.tasks = {
                    some: {
                        produceable: true,
                        [query._dateType]: dq,
                    },
                };
                break;
        }
    }
    // where.tasks = {
    //     some: {
    //         OR: [
    //             {
    //                 taskName: '',
    //             }
    //         ]
    //     }
    // }
    switch (query._installation) {
        case "No Submission":
            break;
        case "Submitted":
            break;
    }
    return where;
}
