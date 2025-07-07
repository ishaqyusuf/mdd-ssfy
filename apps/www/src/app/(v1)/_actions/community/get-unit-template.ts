"use server";

import { prisma } from "@/db";

export async function getUnitTemplateLink(
  projectId,
  defaultTemplatId,
  modelName
) {
  const community = await prisma.communityModels.findFirst({
    where: {
      projectId,
      modelName,
    },
  });
  if (community)
    return `/settings/community/community-template/${community.slug}`;
  const defaultT = await prisma.homeTemplates.findUnique({
    where: {
      id: defaultTemplatId,
    },
  });
  if (defaultT) return `/settings/community/model-template/${defaultT.slug}`;

  return null;
}
