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
import { object, z } from "zod";
import {
  getCommunityPivotId,
  linkUnitsToCommunityByPivotId,
  synchronizeModelCost,
} from "@community/db-utils";
import dayjs, { formatDate } from "@gnd/utils/dayjs";
import { sum } from "@gnd/utils";
import { composeStepFormDisplay } from "@sales/utils/sales-control";
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
  data: CommunityModelCostForm
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
  let modelCosts = model?.pivot?.modelCosts;
  return {
    modelCosts: modelCosts!.map((m) => ({
      ...m,
      meta: m.meta as any as ICostChartMeta,
    })),
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
  data: CommunityModelCostForm
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
      mcMeta.totalCost = sum([
        ...Object.values(mcMeta.costs),
        ...Object.values(mcMeta.tax),
      ]);
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
