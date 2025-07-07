"use server";

import { oldSiteJobs } from "@/data/old-site-jobs";
import { Jobs, prisma, Prisma } from "@/db";
import { queryBuilder } from "@/lib/db-utils";
import { BaseQuery } from "@/types/action";
import { IJobMeta } from "@/types/hrm";
import { InstallCostSettings } from "@/types/settings";

import { getSettingAction } from "../settings";

export async function getRestorableJobsCount() {
    return await prisma.posts.count({
        where: {
            type: "job-restore",
            status: { not: "restored" },
        },
    });
}
interface Props extends BaseQuery {}
export async function getRestorableJobs(query: Props) {
    const builder = await queryBuilder<Prisma.PostsWhereInput>(
        query,
        prisma.posts,
    );
    builder.register("type", "job-restore");

    return builder.response(
        await prisma.posts.findMany({
            where: builder.getWhere(),
            ...builder.queryFilters,
        }),
    );
}
export async function insertJobs() {
    //   await prisma.jobs.deleteMany({
    //     where: {
    //       id: {
    //         gt: 4074,
    //       },
    //     },
    //   });
    const installSetting: InstallCostSettings = (await getSettingAction(
        "install-price-chart",
    )) as any;

    const inserts: Jobs[] = [];
    const notFound: any = [];
    oldSiteJobs
        .filter((j) => j.done_by == "Hector Gonzalez")
        .map((job) => {
            const ometa = JSON.parse(job.meta || "");
            const meta: IJobMeta = {} as any;

            meta.costData = {};
            meta.taskCost = ometa?.sub_total;
            meta.additional_cost = ometa?.additional_cost;

            if (ometa?.cost_data?.length > 0) {
                ometa?.cost_data.map((cd) => {
                    if (cd.title == "Addon") meta.addon = cd.total;
                    else {
                        const s = installSetting.meta.list.find(
                            (s) => s.title == cd.title,
                        );
                        if (s) {
                            meta.costData[s.uid] = {
                                cost: s.cost,
                                qty: cd.qty,
                            };
                        } else {
                            notFound.push(cd.title);
                        }
                    }
                });
            }
            const {
                approved_at: approvedAt,
                approved_by: approvedBy,
                admin_note: adminNote,
                description,
                home_id: homeId,
                project_id: projectId,
                note,
                status,
                status_date: statusDate,
                subtitle,
                title,
                created_at: createdAt,
                updated_at: updatedAt,
                user_id: userId,
            } = job;
            const coWorkerId = ometa?.co_installer_id;

            const newJob: Jobs = {
                amount: Number(job.amount),
                adminNote,
                approvedAt,
                approvedBy,
                coWorkerId,
                description,
                homeId: Number(homeId) || null,
                projectId: Number(projectId) || null,
                note,
                status,
                statusDate: new Date(statusDate),
                subtitle,
                title,
                createdAt: new Date(createdAt),
                updatedAt: new Date(updatedAt),
                meta: meta as any,
                userId: Number(userId),
                type: "installation",
            } as any;
            inserts.push(newJob);
        });
    //   console.log(
    //     await prisma.jobs.findFirst({
    //       orderBy: {
    //         id: "desc",
    //       },
    //     })
    //   );
    await prisma.jobs.createMany({
        data: inserts as any,
    });
    return { inserts, notFound };
    //   console.log(inserts);
}
