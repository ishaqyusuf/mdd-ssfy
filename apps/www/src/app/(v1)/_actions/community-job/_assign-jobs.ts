"use server";

import { prisma } from "@/db";
import {
    CommunityTaskQuery,
    whereProductionQuery,
} from "../community-production/get-productions";
import { getPageInfo, queryFilter } from "../action-utils";
import { _taskNames } from "../community/_task-names";
import { _revalidate, RevalidatePaths } from "../_revalidate";
import { _alert, _notifyTaskAssigned } from "../notifications";
import { IJobs } from "@/types/hrm";
import { ICommunityPivot } from "@/types/community";

export async function _getCommunityJobTasks(query: CommunityTaskQuery) {
    if (!query._task)
        query._task = await _taskNames({
            installable: true,
        } as any);
    const where = await whereProductionQuery(query);
    const _items = await prisma.homeTasks.findMany({
        ...(await queryFilter(query)),
        where,
        include: {
            job: true,
            assignedTo: true,
            home: {
                include: {
                    communityTemplate: {
                        include: {
                            pivot: true,
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
export async function _linkTaskToJob(taskId, jobId) {
    await prisma.homeTasks.update({
        where: {
            id: taskId,
        },
        data: {
            job: {
                connect: {
                    id: jobId,
                },
            },
        },
    });
}
export interface AssignJobProps {
    taskId;
    userId;
    __taskSubtitle;
    jobType;
    action?: AssignJobActions;
    projectId;
    projectTitle;
    addon;
    homeId;
    jobId?;
    oldUserId?;
}
export type AssignJobActions =
    | "ignoreJobs"
    | "ignoreAssign"
    | "ignoreAssignAndComplete"
    | "ignoreInstallCost"
    | undefined;
export async function _unassignTask({
    taskId,
    jobId,
    path = "communityTasks",
}: {
    taskId;
    jobId;
    path?: RevalidatePaths;
}) {
    await prisma.homeTasks.update({
        where: {
            id: taskId,
        },
        data: {
            assignedToId: null,
            jobId: null,
        },
    });
    await prisma.jobs.delete({
        where: {
            id: jobId,
        },
    });
    await _revalidate(path);
}
export async function _assignJob({
    taskId,
    userId,
    action,
    projectId,
    projectTitle,
    homeId,
    jobType,
    addon,
    jobId,
    oldUserId,
    __taskSubtitle,
}: AssignJobProps) {
    if (!action) {
        const jobs = await prisma.jobs.findMany({
            where: {
                projectId,
                homeId,
                // homeTasks: {
                //     none: {
                //         id: taskId
                //     }
                // }
            },
            include: {
                user: true,
            },
        });
        // console.log(jobs);
        if (jobs.length > 0) {
            // console.log(jobs);
            return { jobs };
        }
    }
    if (action == "ignoreAssign") {
        return;
    }
    if (action == "ignoreAssignAndComplete") {
        await prisma.homeTasks.update({
            where: {
                id: taskId,
            },
            data: {
                status: "Completed",
                statusDate: new Date(),
                updatedAt: new Date(),
            },
        });
    }
    //    if(action != 'ignoreInstallCost') {
    //      const home = await prisma.homes.findUnique({
    //          where: {
    //              id: homeId
    //          },
    //          include: {
    //              communityTemplate: {
    //                  include: {
    //                      pivot: true
    //                  }
    //              }
    //          }
    //      });
    //      const pivot: ICommunityPivot = home?.communityTemplate?.pivot as any;
    //      if (!pivot) {
    //         // find pivot or create.

    //      }
    //    }

    const _task = await prisma.homeTasks.update({
        where: { id: taskId },
        data: {
            status: "Assigned",
            assignedTo: {
                connect: {
                    id: userId,
                },
            },
            job: jobId
                ? {
                      update: {
                          where: {
                              id: jobId,
                          },
                          data: {
                              userId,
                              updatedAt: new Date(),
                          },
                      },
                  }
                : {
                      create: {
                          title: projectTitle,
                          subtitle: __taskSubtitle,
                          homeId,
                          projectId,
                          type: jobType,
                          createdAt: new Date(),
                          updatedAt: new Date(),
                          status: "Assigned",
                          amount: 0,
                          userId: userId,
                          meta: {
                              costData: {},
                              taskCost: {},
                              addon,
                          },
                      } as IJobs as any,
                  },
        },
        include: {
            assignedTo: true,
        },
    });
    console.log(_task);
    // const _job = await prisma.
    await _revalidate("communityTasks");
    await (await _alert()).taskAssigned(_task as any, __taskSubtitle);
    //    _notifyTaskAssigned(_task as any, __taskSubtitle);
}
