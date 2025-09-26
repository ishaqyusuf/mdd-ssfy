import type {
  CommunityTemplateForm,
  CreateCommunityModelCost,
} from "@api/schemas/community";
import type { TRPCContext } from "@api/trpc/init";
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
import { formatMoney, sum } from "@gnd/utils";
import type { Db, Prisma } from "@gnd/db";
import { paginationSchema } from "@gnd/utils/schema";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import type { ProjectMeta } from "@api/types/community";
export async function projectList(ctx: TRPCContext) {
  const list = await ctx.db.projects.findMany({
    select: {
      id: true,
      title: true,
      builderId: true,
      meta: true,
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
  costs: z.record(z.any().optional().nullable()),
  tax: z.record(z.any().optional().nullable()),
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
  type: z.enum(["projects", "units"]),
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
  }
}
export const getCommunityProjectsSchema = z
  .object({
    builderId: z.number().optional().nullable(),
  })
  .merge(paginationSchema);
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
