"use server";

import { prisma, Prisma } from "@/db";
import { whereQuery } from "@/lib/db-utils";
import { BaseQuery } from "@/types/action";

import { getPageInfo, queryFilter } from "../action-utils";

export interface CommunityTaskQuery extends BaseQuery {
    _projectId?;
    _task;
}
export async function getProductions(query: CommunityTaskQuery) {
    const where = await whereProductionQuery(query);
    const _items = await prisma.homeTasks.findMany({
        ...(await queryFilter(query)),
        where,
        include: {
            home: {
                include: {
                    _count: {
                        select: {
                            jobs: true,
                        },
                    },
                },
            },
            project: true,
        },
    });
    const pageInfo = await getPageInfo(query, where, prisma.homeTasks);
    return {
        pageInfo,
        data: _items as any,
    };
}
export async function whereProductionQuery(query: CommunityTaskQuery) {
    const q = {
        contains: query._q || undefined,
    } as any;
    const builder = whereQuery<Prisma.HomeTasksWhereInput>(query);
    builder.raw({
        produceable: true,
    });
    builder.search({
        home: {
            OR: [{ modelName: builder.q }, { search: builder.q }],
            builderId: query?._builderId
                ? Number(query?._builderId)
                : undefined,
        },
    });
    builder.orWhere("projectId", +query._projectId);
    if (query._task) {
        builder.raw({
            taskName: {
                in: Array.isArray(query._task) ? query._task : [query._task],
            },
        });
        builder.raw({
            home: {
                id: {
                    gt: 1,
                },
            },
        });
        // builder.where("taskName", {
        //     in: Array.isArray(query._task) ? query._task : [query._task]
        // });
    }
    return builder.get();
}
