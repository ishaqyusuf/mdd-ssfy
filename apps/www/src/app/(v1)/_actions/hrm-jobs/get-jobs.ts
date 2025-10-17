"use server";

import { prisma, Prisma } from "@/db";
import { queryBuilder } from "@/lib/db-utils";
import { BaseQuery } from "@/types/action";

import { userId } from "../utils";

export interface JobsQueryParamsProps extends Omit<BaseQuery, "_show"> {
    _type?: "punchout" | "installation";
    _show?: "unpaid" | "paid" | "approved" | "submitted";
    _homeId?;
}

export async function getMyJobs(query: JobsQueryParamsProps) {
    query._userId = await userId();
    return await getJobs(query);
}
export async function getMyPunchoutJobs(query: JobsQueryParamsProps) {}
export async function getJobs(query: JobsQueryParamsProps) {
    const builder = await queryBuilder<Prisma.JobsWhereInput>(
        query,
        prisma.jobs,
    );
    builder.searchQuery("description", "subtitle", "title");
    builder.orWhere("projectId", Number(query._projectId));
    builder.orWhere("id", Number(query.id));
    builder.orWhere("userId", Number(query._userId));
    builder.orWhere("homeId", Number(query._homeId));

    if (query._show == "unpaid") builder.register("paymentId", null);
    else if (query._show == "paid")
        builder.search({
            paymentId: { gt: 0 },
        });
    else
        builder.search({
            status: { contains: query._show || undefined },
        });

    return builder.response(
        await prisma.jobs.findMany({
            ...builder.queryFilters,
            where: builder.getWhere(),
            include: {
                user: true,
                homeTasks: true,
            },
        }),
    );
}
