import type {
  CommunityTemplateForm,
  CreateCommunityModelCost,
} from "@api/schemas/community";
import { publicProcedure, type TRPCContext } from "@api/trpc/init";
import slugify from "slugify";
import {
  getPivotModel,
  type CommunityBuilderMeta,
  type ICostChartMeta,
} from "@gnd/utils/community";
import { z } from "zod";
import {
  getCommunityPivotId,
  linkUnitsToCommunityByPivotId,
  synchronizeModelCost,
} from "@community/db-utils";
import dayjs, { formatDate } from "@gnd/utils/dayjs";
import { sum } from "@gnd/utils";
import type { Db, Prisma } from "@gnd/db";
import { paginationSchema } from "@gnd/utils/schema";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import type {
  CommunityPivotMeta,
  CommunityTemplateMeta,
  IntallCostMeta,
  JobType,
  ProjectMeta,
} from "@community/types";

export async function projectList(ctx: TRPCContext) {
  const list = await ctx.db.projects.findMany({
    select: {
      id: true,
      title: true,
      builderId: true,
      meta: true,
      builder: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });
  return list;
}
export async function buildersList(ctx: TRPCContext) {
  const _data = await ctx.db.builders.findMany({
    select: {
      id: true,
      name: true,
    },
  });
  return _data;
}
export async function getCommunityTemplateForm(ctx: TRPCContext, templateId) {
  const data = await ctx.db.communityModels.findUniqueOrThrow({
    where: {
      id: templateId,
    },
  });
  return {
    projectId: data.projectId,
    modelName: data.modelName,
    id: data.id,
  };
}
export async function saveCommunityTemplateForm(
  ctx: TRPCContext,
  data: CommunityTemplateForm
) {
  if (data.id) {
    await ctx.db.communityModels.update({
      where: {
        id: data.id!,
      },
      data: {
        modelName: data.modelName,
      },
    });
    if (data.oldModelName && data.oldModelName != data.modelName) {
      await ctx.db.homes.updateMany({
        where: {
          projectId: data.projectId,
          modelName: data.modelName,
        },
        data: {
          communityTemplateId: data.id!,
          modelName: data.modelName,
        },
      });
    }
  } else {
    const slug = slugify(`${data.projectName} ${data.modelName}`);
    const privotModel = getPivotModel(data.modelName);
    let pivot = await ctx.db.communityModelPivot.findFirst({
      where: {
        model: privotModel,
        projectId: data.projectId,
      },
    });
    if (!pivot) {
      pivot = await ctx.db.communityModelPivot.create({
        data: {
          model: privotModel,
          projectId: data.projectId,
          meta: {},
        },
      });
    }
    const temp = await ctx.db.communityModels.create({
      data: {
        slug,
        modelName: data.modelName,
        project: {
          connect: {
            id: data.projectId,
          },
        },
      },
    });
    await ctx.db.homes.updateMany({
      where: {
        projectId: temp.projectId,
        modelName: temp.modelName,
      },
      data: {
        communityTemplateId: temp.id,
      },
    });
  }
}
export async function createCommnunityModelCost(
  ctx: TRPCContext,
  data: CreateCommunityModelCost
) {
  const slug = slugify(`${data.builderName} ${data.modelName}`);
  await ctx.db.homeTemplates.create({
    data: {
      builderId: data.builderId,
      modelName: data.modelName,
      slug,
    },
  });
}

export const communityModelCostHistorySchema = z.object({
  id: z.number(),
});
export type CommunityModelCostHistory = z.infer<
  typeof communityModelCostHistorySchema
>;

export async function communityModelCostHistory(
  ctx: TRPCContext,
  data: CommunityModelCostForm,
  retry = false
) {
  const { db } = ctx;
  const model = await db.communityModels.findFirstOrThrow({
    where: {
      id: data.id,
    },
    include: {
      project: {
        select: {
          title: true,
          builder: {
            select: {
              meta: true,
            },
          },
        },
      },
      pivot: {
        include: {
          modelCosts: true,
          _count: {
            select: {
              modelCosts: true,
            },
          },
        },
      },
    },
  });
  if (!model?.pivotId && !retry) {
    await _createMissingPivots(db);
    await _addMissingPivotToModelCosts(db);
    return communityModelCostHistory(ctx, data, true);
  }
  let modelCosts = model?.pivot?.modelCosts! || [];
  // if (modelCosts) modelCosts = [];
  return {
    modelCosts: modelCosts.map((m) => ({
      ...m,
      meta: m.meta as any as ICostChartMeta,
    })),
    // modelCosts: [],
    model,
    builderTasks: (model?.project?.builder?.meta as any as CommunityBuilderMeta)
      ?.tasks,
  };
}
export const communityInstallCostFormSchema = z.object({
  projectId: z.number(),
});
export type CommunityInstallCostForm = z.infer<
  typeof communityInstallCostFormSchema
>;

export async function communityInstallCostForm(
  ctx: TRPCContext,
  data: CommunityInstallCostForm
) {
  const config = await getInstallPriceConfiguration(ctx);
  const model = await ctx.db.communityModels.findFirstOrThrow({
    where: {
      id: data.projectId,
    },
    select: {
      id: true,
      meta: true,
      modelName: true,
      pivot: {
        select: {
          id: true,
          meta: true,
        },
      },
      project: {
        select: {
          title: true,
          builder: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  const installCosts = (model?.meta as any as CommunityTemplateMeta)
    ?.installCosts;
  const pivotCost = (model?.pivot?.meta as any as CommunityPivotMeta)
    ?.installCost;
  // installCosts?.[0]?.costings?.
  return {
    config,
    pivotId: model?.pivot?.id,
    communityModelId: model.id,
    // projectId: model.id,
    title: model.modelName,
    subtitle: `${model.project.title} | ${model.project.builder?.name}`,
    // builder: project?.builder?.name,
    installCosts: [],
    installCost: pivotCost || installCosts?.[0] || {},
    meta: {
      pivot: model?.pivot?.meta || ({} as CommunityPivotMeta),
      communityModel: model?.meta as any as CommunityTemplateMeta,
    },
    // costIndex: 0,
    // modelName:
  };
}
export const updateInstallCostSchema = z.object({
  communityModelId: z.number(),
  pivotId: z.number().optional().nullable(),
  // costIndex: z.number(),
  // installCosts: z.array(z.any()),
  meta: z.object({
    pivot: z.any().optional().nullable(),
    communityModel: z.any().optional().nullable(),
  }),
});
export type UpdateInstallCostSchema = z.infer<typeof updateInstallCostSchema>;

export async function updateInstallCost(
  ctx: TRPCContext,
  query: UpdateInstallCostSchema
) {
  const { db } = ctx;
  const { communityModelId, pivotId, meta } = query;
  if (communityModelId)
    await db.communityModels.update({
      where: {
        id: communityModelId,
      },
      data: { meta: meta.communityModel },
    });
  if (pivotId)
    await db.communityModelPivot.update({
      where: {
        id: pivotId,
      },
      data: { meta: meta.pivot as CommunityPivotMeta },
    });
}
export async function getInstallPriceConfiguration(ctx: TRPCContext) {
  const s = await ctx.db.settings.findFirst({
    where: {
      type: "install-price-chart",
    },
  });
  return (s?.meta || {}) as any as IntallCostMeta;
}
export const communityModelCostFormSchema = z.object({
  id: z.number(),
});
export type CommunityModelCostForm = z.infer<
  typeof communityModelCostFormSchema
>;

export async function communityModelCostForm(
  ctx: TRPCContext,
  data: CommunityModelCostForm,
  retry = false
) {
  if (data.id < 0) return null;
  const { db } = ctx;
  const model = await db.communityModelCost.findFirstOrThrow({
    where: {
      id: data.id,
    },
    include: {},
  });

  // let modelCosts = model?.pivot?.modelCosts;
  return {
    id: model.id,
    startDate: model.startDate,
    endDate: model.endDate,
    meta: model.meta as any as ICostChartMeta,
    pivotId: model.pivotId,
    // modelCosts,
  };
}

export const saveCommunityModelCostSchema = z.object({
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  id: z.number().optional().nullable(),
  communityModelId: z.number(),
  pivotId: z.number().optional().nullable(),
  costs: z.record(z.string(), z.any().optional().nullable()),
  tax: z.record(z.string(), z.any().optional().nullable()),
  meta: z.any().optional().nullable(),
  model: z.string(),
});
export type SaveCommunityModelCost = z.infer<
  typeof saveCommunityModelCostSchema
>;
export async function saveCommunityModelCost(
  ctx: TRPCContext,
  data: SaveCommunityModelCost
) {
  return await ctx.db.$transaction(
    async (__tx) => {
      const tx = __tx as any;
      // const { db } = ctx;
      data.pivotId =
        data.pivotId || (await getCommunityPivotId(data.communityModelId, tx));
      const title = [
        data?.startDate ? formatDate(data?.startDate, "MM/DD/YY") : null,
        data?.endDate ? formatDate(data?.endDate, "MM/DD/YY") : "To Date",
      ].join(" - ");
      const current = data.endDate
        ? dayjs(data.endDate).diff(dayjs(), "days") > 0
        : true;
      const mcMeta: ICostChartMeta = {
        ...(data.meta || {}),
        costs: data.costs,
        tax: data.tax,
      };
      mcMeta.totalCost = sum([...Object.values(mcMeta.costs)]);
      mcMeta.totalTax = sum([...Object.values(mcMeta.tax)]);
      mcMeta.sumCosts = {};
      Array.from(
        new Set([...Object.keys(mcMeta.costs), ...Object.keys(mcMeta.tax)])
      ).map((k) => {
        mcMeta.sumCosts[k] = sum([mcMeta.costs[k], mcMeta.tax[k]]);
      });
      mcMeta.grandTotal = sum([mcMeta.totalCost, mcMeta.totalTax]);

      let mc;
      if (!data.id) {
        mc = await __tx.communityModelCost.create({
          data: {
            startDate: data.startDate!,
            endDate: data.endDate,
            current,
            pivot: {
              connect: {
                id: data.pivotId!,
              },
            },
            community: {
              connect: {
                id: data.communityModelId,
              },
            },
            meta: {
              ...mcMeta,
            },
            type: "task-costs",
            title,
            model: data.model,
          },
        });
      } else {
        mc = await __tx.communityModelCost.update({
          where: {
            id: data.id,
          },
          data: {
            title,
            meta: {
              ...mcMeta,
            },
            current,
          },
        });
      }
      await linkUnitsToCommunityByPivotId(data.pivotId, tx);
      await synchronizeModelCost(mc.id, data.pivotId, tx);
    },
    {
      timeout: 20 * 1000,
    }
  );
}
export const deleteCommunityModelCostSchema = z.object({
  modelCostId: z.number(),
});
export type DeleteCommunityModelCost = z.infer<
  typeof deleteCommunityModelCostSchema
>;

export async function deleteCommunityModelCost(
  ctx: TRPCContext,
  data: DeleteCommunityModelCost
) {
  const { db } = ctx;
  await db.communityModelCost.update({
    where: {
      id: data.modelCostId,
    },
    data: {
      deletedAt: new Date(),
    },
  });
}
export async function _createMissingPivots(prisma: Db) {
  await Promise.all(
    (
      await prisma.communityModels.findMany({
        where: {
          pivot: {
            is: null,
          },
        },
      })
    ).map(async (p) => {
      const pivotM = getPivotModel(p.modelName);
      let pivot = await prisma.communityModelPivot.findFirst({
        where: {
          model: pivotM,
          projectId: p.projectId,
        },
      });
      if (!pivot) {
        pivot = await prisma.communityModelPivot.create({
          data: {
            model: pivotM,
            projectId: p.projectId,
            meta: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
      await prisma.communityModels.update({
        where: { id: p.id },
        data: {
          pivotId: pivot.id,
        },
      });
    })
  );
}
export async function _addMissingPivotToModelCosts(prisma: Db) {
  const p = await prisma.communityModelCost.findMany({
    where: {
      pivotId: null,
      community: {
        isNot: null,
      },
    },
    include: {
      community: {
        select: {
          pivotId: true,
        },
      },
    },
  });
  const __: any = {};
  p.map((pp) => {
    const pid = pp.community?.pivotId;
    if (pid) {
      if (!__[pid?.toString()]) __[pid?.toString()] = [];
      __[pid?.toString()].push(pp.id);
    }
  });
  await Promise.all(
    Object.entries(__).map(async ([k, v]) => {
      await prisma.communityModelCost.updateMany({
        where: {
          id: {
            in: v as any,
          },
        },
        data: {
          pivotId: Number(k),
        },
      });
    })
  );
}
export const communitySummarySchema = z.object({
  type: z.enum(["projects", "units", "builders", "templates"]),
});
export type CommunitySummary = z.infer<typeof communitySummarySchema>;
export async function communitySummary(
  db: Db,
  data: CommunitySummary
): Promise<{ value: any; subtitle?: string }> {
  switch (data.type) {
    case "projects":
      const productCount = await db.projects.count({
        where: {},
      });

      return {
        value: productCount,
        // subtitle: `${publishedProducts} pending`,
      };
    case "units":
      const inv = await db.homes.count({
        where: {},
      });
      return {
        value: inv,
        // subtitle: `Total community units`,
      };
    case "builders":
      const builders = await db.builders.count({
        where: {},
      });
      return {
        value: builders,
        // subtitle: `Total community units`,
      };
    case "templates":
      const t = await db.communityModels.count({
        where: {},
      });
      return {
        value: t,
        // subtitle: `Total community units`,
      };
  }
}
export const getCommunityProjectsSchema = z
  .object({
    builderId: z.number().optional().nullable(),
  })
  .extend(paginationSchema.shape);
export type GetCommunityProjectsSchema = z.infer<
  typeof getCommunityProjectsSchema
>;
export async function getCommunityProjects(
  ctx: TRPCContext,
  query: GetCommunityProjectsSchema
) {
  const { db } = ctx;
  // const query = {};
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereCommunityProjects(query),
    db.projects
  );

  const data = await db.projects.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
      refNo: true,
      createdAt: true,
      title: true,
      meta: true,
      slug: true,
      _count: {
        select: {
          homes: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
      builder: {
        select: {
          name: true,
          id: true,
        },
      },
    },
  });

  return await response(
    data.map((d) => ({
      ...d,
      meta: d.meta as any as ProjectMeta,
    }))
  );
}
function whereCommunityProjects(query: GetCommunityProjectsSchema) {
  const where: Prisma.ProjectsWhereInput[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (!v) continue;
    switch (k as keyof GetCommunityProjectsSchema) {
      case "q":
        where.push({
          title: {
            contains: v as any,
          },
        });
        break;
      case "builderId":
        where.push({
          builderId: {
            equals: Number(v),
          },
        });
        break;
    }
  }
  return composeQuery(where);
}

/*
deleteUnits: publicProcedure
      .input(deleteUnitsSchema)
      .mutation(async (props) => {
        return deleteUnits(props.ctx, props.input);
      }),
*/
export const deleteUnitsSchema = z.object({
  unitIds: z.array(z.number()),
});
export type DeleteUnitsSchema = z.infer<typeof deleteUnitsSchema>;

export async function deleteUnits(ctx: TRPCContext, query: DeleteUnitsSchema) {
  const { db } = ctx;

  await db.homes.updateMany({
    where: {
      id: {
        in: query.unitIds,
      },
    },
    data: {
      deletedAt: new Date(),
    },
  });
}

export const getProjectFormSchema = z.object({
  projectId: z.number(),
});
export type GetProjectFormSchema = z.infer<typeof getProjectFormSchema>;

export async function getProjectForm(
  ctx: TRPCContext,
  query: GetProjectFormSchema
) {
  const { db } = ctx;
}

/*

*/
export const getUnitJobsSchema = z.object({
  projectId: z.number(),
  jobType: z.enum(["punchout", "installation", "Deco-Shutter"]),
  status: z.enum(["any", "available"]).default("any").optional().nullable(),
});
export type GetUnitJobsSchema = z.infer<typeof getUnitJobsSchema>;

export async function getUnitJobs(ctx: TRPCContext, query: GetUnitJobsSchema) {
  const { db } = ctx;
  const { projectId, jobType } = query;
  const byAvailability = query.status == "available";
  if (!projectId)
    return {
      homeList: [],
      addon: 0,
    };
  const project = await db.projects.findFirst({
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
  const ls: any[] = [];
  const proj: any = project as any;

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
        (j) => j.type?.toLowerCase() == ("installation" as JobType)
      ).length == 0
    )
      return;

    // if (isTestUnit) console.log(unit);
    let template: any = unit.homeTemplate as any;
    let communityTemplate: any = project.communityModels.find(
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
      .sort((a, b) => a?.name?.localeCompare(b.name) as any) as any[],
    addon: proj?.meta?.addon,
  };
}
function initJobData(unit: any, project: any, cost: any | undefined) {
  if (!cost || Object.values(cost)?.filter(Boolean).length < 3) {
    return null;
  }
  const costing = JSON.parse(JSON.stringify(cost));
  // deepCopy<InstallCosting>(cost);

  const masterCosting = project?.meta?.installCosts?.[0]?.costings;

  if (masterCosting) {
    Object.entries(costing).map(([k, v]) => {
      const mV = Number(masterCosting?.[k] || -1);

      if (!v && mV > -1) {
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
