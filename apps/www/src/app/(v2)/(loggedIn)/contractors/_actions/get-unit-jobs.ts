"use server";

import { prisma } from "@/db";
import { deepCopy } from "@/lib/deep-copy";
import {
    ExtendedHome,
    HomeTemplateMeta,
    ICommunityPivotMeta,
    ICommunityTemplate,
    ICommunityTemplateMeta,
    IHome,
    IHomeTemplate,
    IProject,
    InstallCost,
    InstallCosting,
} from "@/types/community";
import { HomeJobList, IJobMeta, IJobType } from "@/types/hrm";

export async function getUnitJobs(
    projectId,
    jobType: IJobType,
    byAvailability = true
) {
    if (!projectId)
        return {
            homeList: [],
            addon: 0,
        };
    const project = await prisma.projects.findFirst({
        where: {
            id: projectId,
        },
        include: {
            communityModels: {
                include: {
                    pivot: true,
                },
            },
            homes: {
                // where: {},
                include: {
                    homeTemplate: true,
                    jobs: {
                        select: {
                            id: true,
                            type: true,
                        },
                    },
                    // _count: {
                    //     select: {
                    //         jobs: {
                    //             // where: {
                    //             //     type: jobType,
                    //             // },
                    //         },
                    //     },
                    // },
                },
            },
        },
    });
    const ls: HomeJobList[] = [];
    const proj: IProject = project as any;

    project?.homes?.map((unit) => {
        const isTestUnit = unit.lot == "1118";
        const _count = unit.jobs.filter(
            (j) => j.type?.toLowerCase() == jobType?.toLowerCase()
        ).length;
        if (_count > 0 && byAvailability) {
            return;
        }
        if (
            jobType == "punchout" &&
            unit.jobs.filter(
                (j) => j.type?.toLowerCase() == ("installation" as IJobType)
            ).length == 0
        )
            return;

        // if (isTestUnit) console.log(unit);
        let template: IHomeTemplate = unit.homeTemplate as any;
        let communityTemplate: ICommunityTemplate =
            project.communityModels.find(
                (m) => m.modelName == unit.modelName
            ) as any;
        // if (isTestUnit) console.log(communityTemplate);
        // if (jobType == "punchout") {
        //     ls.push({
        //         id: unit.id,
        //         name: unitTaskName(unit),
        //         disabled: unit._count.jobs > 0,
        //     });
        //     return;
        // }
        const pivotInstallCost = communityTemplate?.pivot?.meta?.installCost;
        if (pivotInstallCost) {
            console.log(pivotInstallCost);
            _pushCost(initJobData(unit as any, proj, pivotInstallCost));
            return;
        }
        if (communityTemplate?.meta?.overrideModelCost) {
            const cost = communityTemplate?.meta?.installCosts?.[0]?.costings;

            if (_pushCost(initJobData(unit as any, proj, cost))) return;
        }
        if (!template) {
            const costings = proj.meta.installCosts?.[0]?.costings;
            _pushCost(initJobData(unit as any, proj, costings));
            return;
        }
        template.meta.installCosts?.map((cost) => {
            _pushCost(initJobData(unit as any, proj, cost?.costings));
        });
    }); //.filter(Boolean)
    function _pushCost(cdata) {
        ls.push(cdata);
        return cdata != null;
    }
    return {
        homeList: ls
            .filter(Boolean)
            .sort(
                (a, b) => a?.name?.localeCompare(b.name) as any
            ) as HomeJobList[],
        addon: proj?.meta?.addon,
    };
}

function initJobData(
    unit: ExtendedHome,
    project: IProject,
    cost: InstallCosting | undefined
) {
    if (!cost || Object.values(cost)?.filter(Boolean).length < 3) {
        // console.log(cost);
        return null;
    }
    const costing = deepCopy<InstallCosting>(cost);
    // console.log(".....");
    const masterCosting = project?.meta?.installCosts?.[0]?.costings;
    // console.log(".....");
    if (masterCosting) {
        // console.log(".....");
        Object.entries(costing).map(([k, v]) => {
            // console.log(".....");
            const mV = Number(masterCosting?.[k] || -1);
            // console.log(".....", mV);
            if (!v && mV > -1) {
                // console.log([k, v, unit.modelName]);
                costing[k] = mV;
            }
        });
    }
    let name = unitTaskName(unit);

    // if (!unit.jobs.find(j => j.title?.toLowerCase() == name?.toLowerCase())) {
    return {
        id: unit.id,
        name,
        costing,
        disabled: (unit as any)._count?.jobs > 0,
    } as any;
    // }
    return null as any;
}
function unitTaskName(unit) {
    return `BLK${unit.block} LOT${unit.lot} (${unit.modelName})`;
}
