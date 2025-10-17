import type { Db, Prisma } from "@gnd/db";
import { getPivotModel } from "./utils";
import { CostChartMeta } from "./types";
import { dateQuery } from "@gnd/utils";
export async function getCommunityPivotId(id, db: Db) {
  const c = await db.communityModels.findUnique({ where: { id } });
  if (!c) return null;
  if (c?.pivotId) return c.pivotId;
  const pivotM = getPivotModel(c?.modelName);

  const pivot = await db.communityModelPivot.findFirst({
    where: {
      model: pivotM,
      projectId: c.id,
    },
  });
  if (pivot) {
    await db.communityModels.update({
      where: { id },
      data: {
        pivot: {
          connect: {
            id: pivot.id,
          },
        },
      },
    });
    return pivot.id;
  }
  return null;
}
export async function linkUnitsToCommunityByPivotId(pivotId, db: Db) {
  const pivot = await db.communityModelPivot.findUnique({
    where: {
      id: pivotId,
    },
    include: {
      communityModels: true,
    },
  });
  if (pivot) {
    await Promise.all(
      pivot.communityModels.map(async (model) => {
        await db.homes.updateMany({
          where: {
            projectId: model.projectId,
            modelName: model.modelName,
          },
          data: {
            communityTemplateId: model.id,
          },
        });
      })
    );
  }
}
export async function synchronizeModelCost(id, pivotId, db: Db) {
  const c = await db.communityModelCost.findFirstOrThrow({
    where: {
      id,
    },
    include: {
      community: true,
    },
  });
  const meta = c.meta as any as CostChartMeta;
  await Promise.all(
    Object.entries(meta.sumCosts)?.map(async ([k, v]) => {
      const { startDate: from, endDate: to } = c;
      const whereHomTasks: Prisma.HomeTasksWhereInput = {
        home: {
          // communityTemplateId: templateId,
          communityTemplate: {
            pivotId,
          },
          ...dateQuery({
            from,
            to,
          }),
        },
        taskUid: k,
      };
      await db.homeTasks.updateMany({
        where: whereHomTasks,
        data: {
          amountDue: Number(v) || 0,
          updatedAt: new Date(),
        },
      });
    })
  );
}
