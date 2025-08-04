import type { CommunityTemplateForm } from "@api/schemas/community";
import type { TRPCContext } from "@api/trpc/init";

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
) {}
