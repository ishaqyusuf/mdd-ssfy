import type { CommunityTemplateForm } from "@api/schemas/community";
import type { TRPCContext } from "@api/trpc/init";
import slugify from "slugify";

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
  const slug = slugify(`${data.projectName} ${data.modelName}`);
  data.id
    ? await ctx.db.communityModels.update({
        where: {
          id: data.id!,
        },
        data: {
          modelName: data.modelName,
        },
      })
    : await ctx.db.communityModels.create({
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
}
