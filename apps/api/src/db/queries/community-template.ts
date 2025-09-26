import type { TRPCContext } from "@api/trpc/init";
import type { CostChartMeta } from "@community/types";
import type { Prisma } from "@gnd/db";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

export const getCommunityTemplatesSchema = z
  .object({
    projectId: z.number().optional().nullable(),
    builderId: z.number().optional().nullable(),
  })
  .merge(paginationSchema);
export type GetCommunityTemplatesSchema = z.infer<
  typeof getCommunityTemplatesSchema
>;

export async function getCommunityTemplates(
  ctx: TRPCContext,
  query: GetCommunityTemplatesSchema
) {
  const { db } = ctx;
  const model = db.communityModels;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereCommunityTemplates(query),
    model
  );

  const data = await model.findMany({
    where,
    ...searchMeta,
    include: {
      project: {
        select: {
          title: true,
          meta: true,
          builderId: true,
          builder: {
            select: {
              name: true,
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
      costs: true,
      // builder: true,
      _count: {
        select: {
          homes: true,
          // piv: true
        },
      },
    },
  });

  return await response(
    data.map((d) => ({
      ...d,
      costs: d.costs.map((c) => ({
        ...c,
        meta: c.meta as any as CostChartMeta,
      })),
    }))
  );
}
function whereCommunityTemplates(query: GetCommunityTemplatesSchema) {
  const where: Prisma.CommunityModelsWhereInput[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (!v) continue;
    switch (k as keyof GetCommunityTemplatesSchema) {
      case "q":
        const q = {
          contains: v as string,
        };
        where.push({
          OR: [{ modelName: q }],
        });
        break;
      case "projectId":
        where.push({
          projectId: Number(v),
        });
        break;
      case "builderId":
        where.push({
          project: {
            builderId: Number(v),
          },
        });
        break;
    }
  }
  return composeQuery(where);
}
