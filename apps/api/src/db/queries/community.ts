import type {
  CommunityTemplateForm,
  CreateCommunityModelCost,
} from "@api/schemas/community";
import type { TRPCContext } from "@api/trpc/init";
import slugify from "slugify";
import { getPivotModel } from "@gnd/utils/community";
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
    // builderId: data.
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
