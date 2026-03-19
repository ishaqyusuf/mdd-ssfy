import type { TRPCContext } from "@api/trpc/init";
import type {
  CommunityPivotMeta,
  CommunityTemplateMeta,
  CostChartMeta,
} from "@community/types";
import type { Prisma } from "@gnd/db";
import { dataAsType } from "@gnd/utils";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

export const getCommunityTemplatesSchema = z
  .object({
    projectId: z.number().optional().nullable(),
    builderId: z.number().optional().nullable(),
  })
  .extend(paginationSchema.shape);
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
              tasks: {
                select: {
                  id: true,
                  taskName: true,
                },
              },
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
      communityModelInstallTasks: {
        select: {
          builderTaskId: true,
          qty: true,
          installCostModel: {
            select: {
              unitCost: true,
            },
          },
        },
      },
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
    data.map((d) => {
      const meta = dataAsType<CommunityTemplateMeta>(d.meta);
      const pivotMeta = dataAsType<CommunityPivotMeta>(d.pivot?.meta);
      const builderTasks = d.project?.builder?.tasks || [];
      const builderTaskStats = new Map<
        number,
        {
          taskId: number;
          taskName: string;
          lineCount: number;
          totalQty: number;
          totalEstimate: number;
        }
      >();

      for (const task of builderTasks) {
        builderTaskStats.set(task.id, {
          taskId: task.id,
          taskName: task.taskName,
          lineCount: 0,
          totalQty: 0,
          totalEstimate: 0,
        });
      }

      for (const installTask of d.communityModelInstallTasks || []) {
        if (!installTask.builderTaskId) continue;
        const stat = builderTaskStats.get(installTask.builderTaskId);
        if (!stat) continue;
        const qty = Number(installTask.qty || 0);
        const unitCost = Number(installTask.installCostModel?.unitCost || 0);
        stat.lineCount += 1;
        stat.totalQty += qty;
        stat.totalEstimate = +(stat.totalEstimate + qty * unitCost).toFixed(2);
      }

      const configuredTasks = Array.from(builderTaskStats.values()).filter(
        (task) => task.lineCount > 0,
      );
      const totalBuilderTasks = builderTasks.length;
      const configuredBuilderTasks = configuredTasks.length;
      const totalQty = configuredTasks.reduce(
        (sum, task) => sum + task.totalQty,
        0,
      );
      const totalEstimate = +configuredTasks
        .reduce((sum, task) => sum + task.totalEstimate, 0)
        .toFixed(2);
      const completionRatio =
        totalBuilderTasks > 0 ? configuredBuilderTasks / totalBuilderTasks : 0;

      return {
        ...d,
        hasInstallCost: !!meta?.installCosts?.[0],
        hasPivotInstallCost: !!pivotMeta?.installCost,
        installCostV2Summary: {
          totalBuilderTasks,
          configuredBuilderTasks,
          totalQty,
          totalEstimate,
          completionRatio,
          tasks: configuredTasks.map((task) => ({
            taskId: task.taskId,
            taskName: task.taskName,
            lineCount: task.lineCount,
            totalQty: task.totalQty,
            totalEstimate: task.totalEstimate,
          })),
        },
        costs: d.costs.map((c) => ({
          ...c,
          meta: c.meta as any as CostChartMeta,
        })),
      };
    })
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
