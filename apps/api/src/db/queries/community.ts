import type {
  CommunityTemplateForm,
  CommunityModelCostForm,
  CreateCommunityModelCost,
  SaveCommunityModelCost,
  UpdateInstallCostSchema,
} from "@api/schemas/community";
import {
  communityModelCostFormSchema,
  saveCommunityModelCostSchema,
  updateInstallCostSchema,
} from "@api/schemas/community";
import { createApiVercelBlobDocumentService } from "@api/utils/documents";
import {
  createStoredDocumentRegistry,
  normalizeStoredDocument,
} from "@api/utils/stored-documents";
import { publicProcedure, type TRPCContext } from "@api/trpc/init";
import { put } from "@vercel/blob";
import { buildOwnerDocumentFolder } from "@gnd/documents";
import slugify from "slugify";
import {
  getPivotModel,
  type CommunityBuilderMeta,
  type ICostChartMeta,
} from "@gnd/utils/community";
import { getUnitProductionStatus } from "@community/utils";
import { z } from "zod";
import {
  getCommunityPivotId,
  linkUnitsToCommunityByPivotId,
  synchronizeModelCost,
} from "@community/db-utils";
import dayjs, { formatDate } from "@gnd/utils/dayjs";
import { stripSpecialCharacters, sum } from "@gnd/utils";
import type { Db, Prisma } from "@gnd/db";
import { paginationSchema } from "@gnd/utils/schema";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { Notifications } from "@gnd/notifications";
import { createActivity } from "@notifications/activities";
import { getSubscribersAccount } from "@notifications/channel-subscribers";
import { mergeTagRows } from "@notifications/tag-values";
import type {
  CommunityPivotMeta,
  CommunityTemplateMeta,
  IntallCostMeta,
  JobType,
  ProjectMeta,
} from "@community/types";
import {
  communityInstllationFilters,
  communityProductionFilter,
  invoiceFilter,
  whereProjectUnits,
} from "./project-units";

function getTagStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (value === undefined || value === null) {
    return [];
  }
  const normalized = String(value).trim();
  return normalized ? [normalized] : [];
}

async function getStoredDocumentsByIds(db: Db, ids: string[]) {
  if (!ids.length) return [];
  const documents = await db.storedDocument.findMany({
    where: {
      id: {
        in: ids,
      },
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return documents.map((document) => normalizeStoredDocument(document));
}

async function getProjectDocumentActivities(db: Db, projectId: number) {
  const activities = await db.notePad.findMany({
    where: {
      tags: {
        some: {
          tagName: "channel",
          tagValue: "community_documents",
        },
      },
      AND: [
        {
          tags: {
            some: {
              tagName: "projectId",
              tagValue: String(projectId),
            },
          },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
    select: {
      id: true,
      subject: true,
      headline: true,
      note: true,
      createdAt: true,
      tags: {
        select: {
          tagName: true,
          tagValue: true,
        },
      },
      senderContact: {
        select: {
          name: true,
          profileId: true,
        },
      },
    },
  });

  const mergedActivities = activities.map(({ tags, ...activity }) => ({
    ...activity,
    tags: mergeTagRows(tags),
  }));
  const uniqueActivities = Array.from(
    new Map(
      mergedActivities.map((activity) => {
        const activityDocumentIds = [
          ...getTagStringArray(activity.tags.documentIds),
          ...getTagStringArray(activity.tags.documentId),
        ].sort();
        const dedupeKey = [
          activity.subject || "",
          activity.headline || "",
          activity.note || "",
          activity.createdAt?.toISOString?.() || "",
          activityDocumentIds.join(","),
        ].join("::");
        return [dedupeKey, activity] as const;
      }),
    ).values(),
  );

  const documentIds = Array.from(
    new Set(
      uniqueActivities.flatMap((activity) => [
        ...getTagStringArray(activity.tags.documentIds),
        ...getTagStringArray(activity.tags.documentId),
      ]),
    ),
  );

  const documents = await getStoredDocumentsByIds(db, documentIds);
  const documentsById = new Map(
    documents.map((document) => [document.id, document]),
  );

  return uniqueActivities.map((activity) => {
    const activityDocumentIds = [
      ...getTagStringArray(activity.tags.documentIds),
      ...getTagStringArray(activity.tags.documentId),
    ];

    return {
      id: activity.id,
      subject: activity.subject || "Project documents uploaded",
      headline: activity.headline || null,
      note: activity.note || null,
      createdAt: activity.createdAt,
      authorName: activity.senderContact?.name || "Unknown",
      documents: activityDocumentIds
        .map((id) => documentsById.get(id))
        .filter(Boolean),
    };
  });
}

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
  return list.map((ls) => ({
    ...ls,
    addon: (ls?.meta as any)?.addon,
  }));
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
  data: CommunityTemplateForm,
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
  data: CreateCommunityModelCost,
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
type CommunityModelCostHistory = z.infer<
  typeof communityModelCostHistorySchema
>;

export async function communityModelCostHistory(
  ctx: TRPCContext,
  data: CommunityModelCostForm,
  retry = false,
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
  data: CommunityInstallCostForm,
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
export async function updateInstallCost(
  ctx: TRPCContext,
  query: UpdateInstallCostSchema,
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
async function getInstallPriceConfiguration(ctx: TRPCContext) {
  const s = await ctx.db.settings.findFirst({
    where: {
      type: "install-price-chart",
    },
  });
  return (s?.meta || {}) as any as IntallCostMeta;
}
export async function communityModelCostForm(
  ctx: TRPCContext,
  data: CommunityModelCostForm,
  retry = false,
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

export async function saveCommunityModelCost(
  ctx: TRPCContext,
  data: SaveCommunityModelCost,
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
        new Set([...Object.keys(mcMeta.costs), ...Object.keys(mcMeta.tax)]),
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
    },
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
  data: DeleteCommunityModelCost,
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
async function _createMissingPivots(prisma: Db) {
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
    }),
  );
}
async function _addMissingPivotToModelCosts(prisma: Db) {
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
    }),
  );
}
export const communitySummarySchema = z.object({
  type: z.enum(["projects", "units", "builders", "templates"]),
});
export type CommunitySummary = z.infer<typeof communitySummarySchema>;
export async function communitySummary(
  db: Db,
  data: CommunitySummary,
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

export const communityDashboardOverviewSchema = z.object({});

function toMonthKey(date?: Date | null) {
  if (!date) return null;
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function createMonthlyBuckets(count = 6) {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - (count - 1 - index),
      1,
    );

    return {
      key: toMonthKey(date)!,
      label: date.toLocaleString("en-US", {
        month: "short",
      }),
    };
  });
}

function toTitleCase(value?: string | null) {
  if (!value) return "Unknown";

  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getProductionState(task: {
  producedAt?: Date | null;
  prodStartedAt?: Date | null;
  sentToProductionAt?: Date | null;
  productionStatus?: string | null;
}) {
  if (task.producedAt) return "Completed";
  if (
    task.prodStartedAt ||
    task.productionStatus?.toLowerCase().includes("start") ||
    task.productionStatus?.toLowerCase().includes("progress")
  ) {
    return "Started";
  }
  if (task.sentToProductionAt) return "Queued";
  return "Idle";
}

function buildStatusBreakdown(statusMap: Record<string, number>) {
  return Object.entries(statusMap)
    .map(([label, value]) => ({
      label,
      value,
    }))
    .sort((left, right) => right.value - left.value);
}

export async function communityDashboardOverview(ctx: TRPCContext) {
  const { db } = ctx;
  const unitSelect = {
    id: true,
    createdAt: true,
    lotBlock: true,
    modelName: true,
    status: true,
    tasks: {
      where: {
        deletedAt: null,
      },
      select: {
        produceable: true,
        sentToProductionAt: true,
        producedAt: true,
        productionDueDate: true,
      },
    },
    _count: {
      select: {
        jobs: true,
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
  } satisfies Prisma.HomesSelect;

  const productionTaskSelect = {
    id: true,
    createdAt: true,
    taskName: true,
    productionStatus: true,
    sentToProductionAt: true,
    producedAt: true,
    prodStartedAt: true,
    productionDueDate: true,
    home: {
      select: {
        lotBlock: true,
        modelName: true,
      },
    },
    project: {
      select: {
        title: true,
      },
    },
  } satisfies Prisma.HomeTasksSelect;

  const invoiceTaskSelect = {
    id: true,
    createdAt: true,
    taskName: true,
    amountDue: true,
    amountPaid: true,
    checkDate: true,
    home: {
      select: {
        lotBlock: true,
        modelName: true,
      },
    },
    project: {
      select: {
        title: true,
      },
    },
  } satisfies Prisma.HomeTasksSelect;

  const jobSelect = {
    id: true,
    createdAt: true,
    title: true,
    type: true,
    status: true,
    amount: true,
    home: {
      select: {
        lotBlock: true,
        modelName: true,
      },
    },
    project: {
      select: {
        title: true,
      },
    },
  } satisfies Prisma.JobsSelect;

  const invoiceWhere: Prisma.HomeTasksWhereInput = {
    deletedAt: null,
    OR: [
      {
        taskUid: {
          not: null,
        },
      },
      {
        amountDue: {
          not: null,
        },
      },
      {
        amountPaid: {
          not: null,
        },
      },
    ],
  };

  const [
    projectsCount,
    templatesCount,
    buildersCount,
    units,
    productionTasks,
    invoiceTasks,
    jobs,
  ] = await Promise.all([
    db.projects.count({
      where: {
        deletedAt: null,
      },
    }),
    db.communityModels.count({
      where: {
        deletedAt: null,
      },
    }),
    db.builders.count(),
    db.homes.findMany({
      where: {
        deletedAt: null,
      },
      select: unitSelect,
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.homeTasks.findMany({
      where: {
        deletedAt: null,
        produceable: true,
      },
      select: productionTaskSelect,
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.homeTasks.findMany({
      where: invoiceWhere,
      select: invoiceTaskSelect,
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.jobs.findMany({
      where: {
        deletedAt: null,
      },
      select: jobSelect,
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const buckets = createMonthlyBuckets();
  const productionTrendMap = new Map(
    buckets.map((bucket) => [
      bucket.key,
      { label: bucket.label, total: 0, completed: 0 },
    ]),
  );
  const unitsTrendMap = new Map(
    buckets.map((bucket) => [
      bucket.key,
      { label: bucket.label, total: 0, withJobs: 0 },
    ]),
  );
  const jobsTrendMap = new Map(
    buckets.map((bucket) => [
      bucket.key,
      { label: bucket.label, total: 0, amount: 0 },
    ]),
  );
  const invoiceTrendMap = new Map(
    buckets.map((bucket) => [
      bucket.key,
      { label: bucket.label, total: 0, amount: 0 },
    ]),
  );

  const unitStatusMap: Record<string, number> = {};
  const productionStatusMap: Record<string, number> = {};
  const jobStatusMap: Record<string, number> = {};
  const invoiceStatusMap: Record<string, number> = {};

  for (const unit of units) {
    const production = getUnitProductionStatus(unit as any);
    unitStatusMap[production.status] =
      (unitStatusMap[production.status] || 0) + 1;

    const unitMonth = unitsTrendMap.get(toMonthKey(unit.createdAt) || "");
    if (unitMonth) {
      unitMonth.total += 1;
      if (unit._count.jobs > 0) {
        unitMonth.withJobs += 1;
      }
    }
  }

  for (const task of productionTasks) {
    const state = getProductionState(task);
    productionStatusMap[state] = (productionStatusMap[state] || 0) + 1;

    const productionMonth = productionTrendMap.get(
      toMonthKey(task.sentToProductionAt || task.createdAt) || "",
    );
    if (productionMonth) {
      productionMonth.total += 1;
      if (state === "Completed") {
        productionMonth.completed += 1;
      }
    }
  }

  let totalInvoiceAmount = 0;
  let totalInvoicePaid = 0;

  for (const task of invoiceTasks) {
    const due = Number(task.amountDue || 0);
    const paid = Number(task.amountPaid || 0);
    totalInvoiceAmount += due;
    totalInvoicePaid += paid;

    let invoiceState = "Unpaid";
    if (paid > 0 && paid < due) {
      invoiceState = "Partial";
    } else if (due > 0 && paid >= due) {
      invoiceState = "Paid";
    }
    invoiceStatusMap[invoiceState] = (invoiceStatusMap[invoiceState] || 0) + 1;

    const invoiceMonth = invoiceTrendMap.get(toMonthKey(task.createdAt) || "");
    if (invoiceMonth) {
      invoiceMonth.total += 1;
      invoiceMonth.amount += due;
    }
  }

  for (const job of jobs) {
    const label = toTitleCase(job.status);
    jobStatusMap[label] = (jobStatusMap[label] || 0) + 1;

    const jobMonth = jobsTrendMap.get(toMonthKey(job.createdAt) || "");
    if (jobMonth) {
      jobMonth.total += 1;
      jobMonth.amount += Number(job.amount || 0);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      projects: projectsCount,
      units: units.length,
      unitsWithJobs: units.filter((unit) => unit._count.jobs > 0).length,
      productions: productionTasks.length,
      jobs: jobs.length,
      invoices: invoiceTasks.length,
      invoiceAmount: totalInvoiceAmount,
      builders: buildersCount,
      templates: templatesCount,
    },
    productions: {
      status: buildStatusBreakdown(productionStatusMap),
      trend: Array.from(productionTrendMap.values()),
      recent: productionTasks.slice(0, 6).map((task) => ({
        id: task.id,
        title: task.taskName || "Production task",
        unit: task.home?.lotBlock || task.home?.modelName || "Unknown unit",
        project: task.project?.title || "Unknown project",
        status: getProductionState(task),
        submittedAt: task.sentToProductionAt || task.createdAt,
        dueDate: task.productionDueDate,
      })),
    },
    units: {
      status: buildStatusBreakdown(unitStatusMap),
      trend: Array.from(unitsTrendMap.values()),
      recent: units.slice(0, 6).map((unit) => {
        const production = getUnitProductionStatus(unit as any);
        return {
          id: unit.id,
          title: unit.lotBlock || unit.modelName || "Unit",
          subtitle: `${unit.project?.title || "Unknown project"}${unit.project?.builder?.name ? ` • ${unit.project.builder.name}` : ""}`,
          status: production.status,
          date: unit.createdAt,
          jobs: unit._count.jobs,
        };
      }),
    },
    jobs: {
      status: buildStatusBreakdown(jobStatusMap),
      trend: Array.from(jobsTrendMap.values()),
      recent: jobs.slice(0, 6).map((job) => ({
        id: job.id,
        title: job.title || job.type || "Job submission",
        subtitle: `${job.project?.title || "Unknown project"}${job.home?.lotBlock ? ` • ${job.home.lotBlock}` : ""}`,
        status: toTitleCase(job.status),
        amount: Number(job.amount || 0),
        date: job.createdAt,
      })),
    },
    invoices: {
      totalAmount: totalInvoiceAmount,
      totalPaid: totalInvoicePaid,
      outstanding: totalInvoiceAmount - totalInvoicePaid,
      status: buildStatusBreakdown(invoiceStatusMap),
      trend: Array.from(invoiceTrendMap.values()),
      recent: invoiceTasks.slice(0, 6).map((task) => ({
        id: task.id,
        title: task.taskName || "Invoice task",
        subtitle: `${task.project?.title || "Unknown project"}${task.home?.lotBlock ? ` • ${task.home.lotBlock}` : ""}`,
        amountDue: Number(task.amountDue || 0),
        amountPaid: Number(task.amountPaid || 0),
        date: task.checkDate || task.createdAt,
      })),
    },
  };
}
export const getCommunityProjectsSchema = z
  .object({
    builderId: z.number().optional().nullable(),
    refNo: z.string().optional().nullable(),
    status: z.enum(["active", "archived"]).optional().nullable(),
  })
  .extend(paginationSchema.shape);
export type GetCommunityProjectsSchema = z.infer<
  typeof getCommunityProjectsSchema
>;
export async function getCommunityProjects(
  ctx: TRPCContext,
  query: GetCommunityProjectsSchema,
) {
  const { db } = ctx;
  // const query = {};
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereCommunityProjects(query),
    db.projects,
  );

  const data = await db.projects.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
      archived: true,
      refNo: true,
      createdAt: true,
      updatedAt: true,
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
          jobs: {
            where: {
              deletedAt: null,
            },
          },
          invoices: {
            where: {
              deletedAt: null,
            },
          },
          homeTasks: {
            where: {
              deletedAt: null,
              produceable: true,
            },
          },
        },
      },
      homeTasks: {
        where: {
          deletedAt: null,
          produceable: true,
        },
        select: {
          id: true,
          producedAt: true,
          prodStartedAt: true,
          sentToProductionAt: true,
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
    })),
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
      case "refNo":
        where.push({
          refNo: {
            contains: String(v),
          },
        });
        break;
      case "status":
        where.push({
          archived: {
            equals: v === "archived",
          },
        });
        break;
    }
  }
  return composeQuery(where);
}

export const communityProjectsOverviewSchema = z.object({
  builderId: z.number().optional().nullable(),
  refNo: z.string().optional().nullable(),
  status: z.enum(["active", "archived"]).optional().nullable(),
});

function createRecentMonthBuckets(count = 6) {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - (count - 1 - index),
      1,
    );
    const key = `${date.getFullYear()}-${date.getMonth()}`;

    return {
      key,
      label: date.toLocaleString("en-US", {
        month: "short",
      }),
      value: 0,
    };
  });
}

function withPercent<T extends { value: number }>(items: T[]) {
  const total = items.reduce((acc, item) => acc + item.value, 0);

  return items.map((item) => ({
    ...item,
    percent: total ? Math.round((item.value / total) * 100) : 0,
  }));
}

function mapProjectProductionStatus(
  tasks: {
    producedAt?: Date | null;
    prodStartedAt?: Date | null;
    sentToProductionAt?: Date | null;
  }[],
) {
  let completed = 0;
  let started = 0;
  let queued = 0;

  for (const task of tasks) {
    if (task.producedAt) {
      completed += 1;
      continue;
    }
    if (task.prodStartedAt) {
      started += 1;
      continue;
    }
    if (task.sentToProductionAt) {
      queued += 1;
    }
  }

  const total = tasks.length;
  const idle = Math.max(total - completed - started - queued, 0);

  if (!total) {
    return {
      label: "No tasks",
      completed,
      started,
      queued,
      idle,
      total,
    };
  }

  if (completed === total) {
    return {
      label: "Completed",
      completed,
      started,
      queued,
      idle,
      total,
    };
  }

  if (started > 0 || completed > 0) {
    return {
      label: "Started",
      completed,
      started,
      queued,
      idle,
      total,
    };
  }

  if (queued > 0) {
    return {
      label: "Queued",
      completed,
      started,
      queued,
      idle,
      total,
    };
  }

  return {
    label: "Idle",
    completed,
    started,
    queued,
    idle,
    total,
  };
}

export async function communityProjectsOverview(
  ctx: TRPCContext,
  query: z.infer<typeof communityProjectsOverviewSchema>,
) {
  const { db } = ctx;
  const where = whereCommunityProjects({
    ...query,
    page: undefined,
    size: undefined,
    cursor: undefined,
  } as GetCommunityProjectsSchema);

  const projects = await db.projects.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      archived: true,
      slug: true,
      title: true,
      refNo: true,
      createdAt: true,
      updatedAt: true,
      meta: true,
      builder: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          homes: {
            where: {
              deletedAt: null,
            },
          },
          jobs: {
            where: {
              deletedAt: null,
            },
          },
          invoices: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
      homeTasks: {
        where: {
          deletedAt: null,
          produceable: true,
        },
        select: {
          producedAt: true,
          prodStartedAt: true,
          sentToProductionAt: true,
        },
      },
    },
  });

  const monthBuckets = createRecentMonthBuckets(6);
  const bucketMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));
  const statusMap = {
    active: 0,
    archived: 0,
  };
  const builderMap = new Map<string, number>();
  let units = 0;
  let jobs = 0;
  let invoices = 0;
  let productionTasks = 0;
  let completedProductionTasks = 0;

  for (const project of projects) {
    const bucket = bucketMap.get(toMonthKey(project.createdAt) || "");
    if (bucket) {
      bucket.value += 1;
    }

    if (project.archived) statusMap.archived += 1;
    else statusMap.active += 1;

    const builderName = project.builder?.name || "Unassigned";
    builderMap.set(builderName, (builderMap.get(builderName) || 0) + 1);

    units += project._count.homes;
    jobs += project._count.jobs;
    invoices += project._count.invoices;
    productionTasks += project.homeTasks.length;
    completedProductionTasks += project.homeTasks.filter(
      (task) => task.producedAt,
    ).length;
  }

  const activeProjects = projects.filter((project) => !project.archived).length;
  const archivedProjects = projects.length - activeProjects;

  return {
    summary: {
      total: projects.length,
      active: activeProjects,
      archived: archivedProjects,
      units,
      jobs,
      invoices,
      productionTasks,
      completedProductionTasks,
    },
    trend: monthBuckets,
    status: withPercent([
      {
        label: "Active",
        value: statusMap.active,
      },
      {
        label: "Archived",
        value: statusMap.archived,
      },
    ]),
    builders: withPercent(
      Array.from(builderMap.entries())
        .map(([label, value]) => ({
          label,
          value,
        }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 6),
    ),
    recent: projects.slice(0, 6).map((project) => {
      const production = mapProjectProductionStatus(project.homeTasks);

      return {
        id: project.id,
        slug: project.slug,
        title: project.title || "Untitled project",
        refNo: project.refNo || "No ref",
        builder: project.builder?.name || "No builder",
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        archived: Boolean(project.archived),
        supervisor: (project.meta as ProjectMeta | null)?.supervisor || null,
        units: project._count.homes,
        jobs: project._count.jobs,
        invoices: project._count.invoices,
        production,
      };
    }),
  };
}

export const communityProjectUnitsOverviewSchema = z.object({
  builderSlug: z.string().optional().nullable(),
  projectSlug: z.string().optional().nullable(),
  production: z.enum(communityProductionFilter).optional().nullable(),
  invoice: z.enum(invoiceFilter).optional().nullable(),
  installation: z.enum(communityInstllationFilters).optional().nullable(),
});

export async function communityProjectUnitsOverview(
  ctx: TRPCContext,
  query: z.infer<typeof communityProjectUnitsOverviewSchema>,
) {
  const { db } = ctx;
  const units = await db.homes.findMany({
    where: whereProjectUnits({
      ...query,
      page: undefined,
      size: undefined,
      cursor: undefined,
      dateRange: undefined,
    }),
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      slug: true,
      createdAt: true,
      lotBlock: true,
      modelName: true,
      tasks: {
        where: {
          deletedAt: null,
          produceable: true,
        },
        select: {
          producedAt: true,
          prodStartedAt: true,
          sentToProductionAt: true,
        },
      },
      _count: {
        select: {
          jobs: true,
        },
      },
      project: {
        select: {
          title: true,
          slug: true,
          builder: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const trend = createRecentMonthBuckets(6);
  const trendMap = new Map(trend.map((bucket) => [bucket.key, bucket]));
  const productionStatusMap = new Map<string, number>();
  let activeJobs = 0;
  let completedUnits = 0;

  for (const unit of units) {
    const bucket = trendMap.get(toMonthKey(unit.createdAt) || "");
    if (bucket) {
      bucket.value += 1;
    }

    const status = getUnitProductionStatus({
      ...unit,
      communityTemplate: null,
      projectId: 0,
      homeTemplateId: null,
    } as any).status;
    productionStatusMap.set(status, (productionStatusMap.get(status) || 0) + 1);
    if (status === "Completed") completedUnits += 1;
    activeJobs += unit._count.jobs;
  }

  return {
    summary: {
      total: units.length,
      completed: completedUnits,
      active: Math.max(units.length - completedUnits, 0),
      jobs: activeJobs,
    },
    trend,
    status: withPercent(
      Array.from(productionStatusMap.entries())
        .map(([label, value]) => ({
          label,
          value,
        }))
        .sort((left, right) => right.value - left.value),
    ),
    recent: units.slice(0, 6).map((unit) => ({
      id: unit.id,
      slug: unit.slug,
      createdAt: unit.createdAt,
      lotBlock: unit.lotBlock,
      modelName: unit.modelName,
      jobs: unit._count.jobs,
      projectTitle: unit.project?.title,
      builderName: unit.project?.builder?.name,
      production: getUnitProductionStatus({
        ...unit,
        communityTemplate: null,
        projectId: 0,
        homeTemplateId: null,
      } as any),
    })),
  };
}

const uploadCommunityProjectDocumentFileSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().optional().nullable(),
  contentBase64: z.string().min(1),
  size: z.number().int().min(0).optional().nullable(),
});

export const uploadCommunityProjectDocumentsSchema = z.object({
  slug: z.string(),
  note: z.string().trim().max(2000).optional().nullable(),
  files: z.array(uploadCommunityProjectDocumentFileSchema).min(1).max(10),
});

export async function uploadCommunityProjectDocuments(
  ctx: TRPCContext,
  input: z.infer<typeof uploadCommunityProjectDocumentsSchema>,
) {
  if (!ctx.userId) {
    throw new Error("You must be signed in to upload documents.");
  }

  const project = await ctx.db.projects.findFirstOrThrow({
    where: {
      slug: input.slug,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  const actor = await ctx.db.users.findFirstOrThrow({
    where: {
      id: ctx.userId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const ownerType = "community_project";
  const ownerId = String(project.id);
  const kind = "community_document";
  const folder = buildOwnerDocumentFolder({
    ownerType,
    ownerId,
    kind,
  });

  const documentService = createApiVercelBlobDocumentService({
    put,
  });
  const documentRegistry = createStoredDocumentRegistry(ctx.db);
  const uploadedFiles = await documentService.uploadMany(
    input.files.map((file) => ({
      filename: stripSpecialCharacters(file.filename) || file.filename,
      folder,
      contentType: file.contentType || undefined,
      body: Buffer.from(file.contentBase64, "base64"),
    })),
  );

  const createdDocuments = await Promise.all(
    uploadedFiles.map((upload, index) =>
      documentRegistry.registerUploaded({
        ownerType,
        ownerId,
        kind,
        upload,
        uploadedBy: ctx.userId,
        isCurrent: false,
        visibility: "public",
        title: input.files[index]?.filename || upload.filename || null,
        description: input.note?.trim() || null,
        meta: {
          projectSlug: project.slug,
          projectTitle: project.title,
          uploadedAt: new Date().toISOString(),
          originalContentType: input.files[index]?.contentType || null,
          originalSize: input.files[index]?.size ?? null,
        },
      }),
    ),
  );

  const activityInput = {
    type: "community_documents" as const,
    source: "user" as const,
    subject: "Project documents uploaded",
    headline: input.note?.trim()
      ? `${actor.name || "Unknown"} uploaded ${createdDocuments.length} document${createdDocuments.length === 1 ? "" : "s"} to ${project.title}. Note: ${input.note.trim()}`
      : `${actor.name || "Unknown"} uploaded ${createdDocuments.length} document${createdDocuments.length === 1 ? "" : "s"} to ${project.title}.`,
    note: input.note?.trim() || undefined,
    tags: {
      projectId: project.id,
      projectSlug: project.slug,
      projectTitle: project.title,
      documentIds: createdDocuments.map((document) => document.id),
      documentNames: createdDocuments.map(
        (document) => document.title || document.filename || "Document",
      ),
    },
  };

  try {
    const notifications = new Notifications(ctx.db);
    const result = await notifications.create(
      "community_documents",
      {
        projectId: project.id,
        projectSlug: project.slug,
        projectTitle: project.title,
        uploadedByName: actor.name || "Unknown",
        documentIds: createdDocuments.map((document) => document.id),
        documentNames: createdDocuments.map(
          (document) => document.title || document.filename || "Document",
        ),
        note: input.note?.trim() || null,
      },
      {
        author: {
          id: ctx.userId,
          role: "employee",
        },
        includeChannelSubscribers: true,
        allowFallbackRecipient: false,
      },
    );

    if (result.activities === 0) {
      const authorContact = (
        await getSubscribersAccount(ctx.db, [ctx.userId], {
          role: "employee",
          channelName: "community_documents",
        })
      )?.[0];
      if (authorContact?.id) {
        await createActivity(ctx.db, activityInput, authorContact.id);
      }
    }
  } catch (error) {
    console.error("Unable to emit community document notification", error);
    const authorContact = (
      await getSubscribersAccount(ctx.db, [ctx.userId], {
        role: "employee",
        channelName: "community_documents",
      })
    )?.[0];
    if (authorContact?.id) {
      await createActivity(ctx.db, activityInput, authorContact.id);
    }
  }

  return {
    documents: createdDocuments.map((document) => ({
      ...normalizeStoredDocument(document),
      uploadedByName: actor.name || "Unknown",
    })),
  };
}

export const communityProjectOverviewSchema = z.object({
  slug: z.string(),
});

export async function communityProjectOverview(
  ctx: TRPCContext,
  query: z.infer<typeof communityProjectOverviewSchema>,
) {
  const project = await ctx.db.projects.findFirstOrThrow({
    where: {
      slug: query.slug,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      archived: true,
      title: true,
      refNo: true,
      address: true,
      createdAt: true,
      updatedAt: true,
      meta: true,
      builder: {
        select: {
          name: true,
          slug: true,
        },
      },
      homes: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          slug: true,
          createdAt: true,
          lotBlock: true,
          modelName: true,
          tasks: {
            where: {
              deletedAt: null,
            },
            select: {
              produceable: true,
              sentToProductionAt: true,
              producedAt: true,
              productionDueDate: true,
            },
          },
          _count: {
            select: {
              jobs: true,
            },
          },
        },
      },
      jobs: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          createdAt: true,
          title: true,
          status: true,
          type: true,
          amount: true,
          home: {
            select: {
              slug: true,
              lotBlock: true,
              modelName: true,
            },
          },
        },
      },
      homeTasks: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
        select: {
          id: true,
          createdAt: true,
          taskName: true,
          produceable: true,
          amountDue: true,
          amountPaid: true,
          producedAt: true,
          prodStartedAt: true,
          sentToProductionAt: true,
          checkDate: true,
          home: {
            select: {
              slug: true,
              lotBlock: true,
              modelName: true,
            },
          },
        },
      },
      _count: {
        select: {
          homes: {
            where: {
              deletedAt: null,
            },
          },
          jobs: {
            where: {
              deletedAt: null,
            },
          },
          invoices: {
            where: {
              deletedAt: null,
            },
          },
          homeTasks: {
            where: {
              deletedAt: null,
              produceable: true,
            },
          },
        },
      },
    },
  });

  const meta = (project.meta as ProjectMeta | null) || null;
  const productionTasks = project.homeTasks.filter((task) => task.produceable);
  const productionStatusMap = {
    queued: 0,
    started: 0,
    completed: 0,
    idle: 0,
  };

  for (const task of productionTasks) {
    const status = getProductionState(
      task,
    ).toLowerCase() as keyof typeof productionStatusMap;
    productionStatusMap[status] += 1;
  }

  const invoiceTasks = project.homeTasks.filter(
    (task) =>
      task.amountDue != null ||
      task.amountPaid != null ||
      task.checkDate != null,
  );
  const invoiceTotals = invoiceTasks.reduce(
    (acc, task) => {
      acc.due += Number(task.amountDue || 0);
      acc.paid += Number(task.amountPaid || 0);
      return acc;
    },
    { due: 0, paid: 0 },
  );

  const [projectDocuments, recentDocumentActivity] = await Promise.all([
    ctx.db.storedDocument.findMany({
      where: {
        ownerType: "community_project",
        ownerId: String(project.id),
        deletedAt: null,
        status: "ready",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
    getProjectDocumentActivities(ctx.db, project.id),
  ]);

  const uploaderIds = Array.from(
    new Set(
      projectDocuments
        .map((document) => document.uploadedBy)
        .filter((value): value is number => Number.isInteger(value)),
    ),
  );
  const uploaders = uploaderIds.length
    ? await ctx.db.users.findMany({
        where: {
          id: {
            in: uploaderIds,
          },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
      })
    : [];
  const uploaderNames = new Map(
    uploaders.map((uploader) => [uploader.id, uploader.name || "Unknown"]),
  );

  return {
    project: {
      ...project,
      meta,
    },
    summary: {
      units: project._count.homes,
      jobs: project._count.jobs,
      invoices: project._count.invoices,
      productionTasks: project._count.homeTasks,
      completedProductionTasks: productionTasks.filter(
        (task) => task.producedAt,
      ).length,
      outstandingInvoiceAmount: invoiceTotals.due - invoiceTotals.paid,
      invoiceDueAmount: invoiceTotals.due,
      invoicePaidAmount: invoiceTotals.paid,
    },
    productionStatus: withPercent([
      {
        label: "Queued",
        value: productionStatusMap.queued,
      },
      {
        label: "Started",
        value: productionStatusMap.started,
      },
      {
        label: "Completed",
        value: productionStatusMap.completed,
      },
      {
        label: "Idle",
        value: productionStatusMap.idle,
      },
    ]),
    recentUnits: project.homes.map((unit) => ({
      id: unit.id,
      slug: unit.slug,
      createdAt: unit.createdAt,
      lotBlock: unit.lotBlock,
      modelName: unit.modelName,
      jobs: unit._count.jobs,
      production: getUnitProductionStatus({
        ...unit,
        communityTemplate: null,
        projectId: project.id,
        homeTemplateId: null,
        project: {
          title: project.title,
          builder: {
            name: project.builder?.name,
          },
        },
      } as any),
    })),
    recentJobs: project.jobs.map((job) => ({
      id: job.id,
      createdAt: job.createdAt,
      title: job.title,
      status: job.status,
      type: job.type,
      amount: Number(job.amount || 0),
      home: job.home,
    })),
    recentInvoices: invoiceTasks.slice(0, 8).map((task) => ({
      id: task.id,
      createdAt: task.checkDate || task.createdAt,
      title: task.taskName || "Invoice task",
      amountDue: Number(task.amountDue || 0),
      amountPaid: Number(task.amountPaid || 0),
      home: task.home,
    })),
    recentProduction: productionTasks.slice(0, 8).map((task) => ({
      id: task.id,
      createdAt: task.createdAt,
      taskName: task.taskName,
      status: getProductionState(task),
      home: task.home,
    })),
    recentDocuments: projectDocuments.map((document) => ({
      ...normalizeStoredDocument(document),
      uploadedByName:
        (document.uploadedBy && uploaderNames.get(document.uploadedBy)) || null,
    })),
    recentDocumentActivity,
  };
}

export const communityProjectUnitOverviewSchema = z.object({
  slug: z.string(),
});

export async function communityProjectUnitOverview(
  ctx: TRPCContext,
  query: z.infer<typeof communityProjectUnitOverviewSchema>,
) {
  const unit = await ctx.db.homes.findFirstOrThrow({
    where: {
      slug: query.slug,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      lotBlock: true,
      lot: true,
      block: true,
      modelName: true,
      address: true,
      status: true,
      projectId: true,
      communityTemplate: {
        select: {
          id: true,
          slug: true,
          modelName: true,
          version: true,
        },
      },
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
          refNo: true,
          builder: {
            select: {
              name: true,
            },
          },
        },
      },
      tasks: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          createdAt: true,
          taskName: true,
          taskUid: true,
          produceable: true,
          productionDueDate: true,
          sentToProductionAt: true,
          prodStartedAt: true,
          producedAt: true,
          amountDue: true,
          amountPaid: true,
          checkDate: true,
        },
      },
      jobs: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          title: true,
          status: true,
          type: true,
          amount: true,
        },
      },
      _count: {
        select: {
          jobs: true,
        },
      },
    },
  });

  const productionTasks = unit.tasks.filter((task) => task.produceable);
  const invoiceTasks = unit.tasks.filter(
    (task) =>
      task.amountDue != null ||
      task.amountPaid != null ||
      task.checkDate != null,
  );
  const invoiceTotals = invoiceTasks.reduce(
    (acc, task) => {
      acc.due += Number(task.amountDue || 0);
      acc.paid += Number(task.amountPaid || 0);
      return acc;
    },
    { due: 0, paid: 0 },
  );

  return {
    unit: {
      ...unit,
      production: getUnitProductionStatus({
        ...unit,
        communityTemplate: unit.communityTemplate,
      } as any),
    },
    summary: {
      jobs: unit._count.jobs,
      productionTasks: productionTasks.length,
      completedProductionTasks: productionTasks.filter(
        (task) => task.producedAt,
      ).length,
      invoiceDueAmount: invoiceTotals.due,
      invoicePaidAmount: invoiceTotals.paid,
      outstandingInvoiceAmount: invoiceTotals.due - invoiceTotals.paid,
    },
    recentProduction: productionTasks.slice(0, 8).map((task) => ({
      id: task.id,
      createdAt: task.createdAt,
      taskName: task.taskName,
      status: getProductionState(task),
      dueDate: task.productionDueDate,
    })),
    recentInvoices: invoiceTasks.slice(0, 8).map((task) => ({
      id: task.id,
      createdAt: task.checkDate || task.createdAt,
      taskName: task.taskName,
      amountDue: Number(task.amountDue || 0),
      amountPaid: Number(task.amountPaid || 0),
    })),
    recentJobs: unit.jobs.map((job) => ({
      id: job.id,
      createdAt: job.createdAt,
      title: job.title,
      status: job.status,
      type: job.type,
      amount: Number(job.amount || 0),
    })),
  };
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

const projectUnitPrintPreflightUnitSchema = z.object({
  id: z.number(),
  slug: z.string().nullable(),
  lotBlock: z.string().nullable(),
});

export const projectUnitPrintPreflightSchema = z.object({
  unitIds: z.array(z.number()).min(1),
});
export type ProjectUnitPrintPreflightSchema = z.infer<
  typeof projectUnitPrintPreflightSchema
>;

export const sendProjectUnitsToProductionSchema = z.object({
  unitIds: z.array(z.number()).min(1),
  dueDate: z.string().datetime().optional().nullable(),
});
export type SendProjectUnitsToProductionSchema = z.infer<
  typeof sendProjectUnitsToProductionSchema
>;

function getProjectUnitPrintKey(
  projectId?: number | null,
  modelName?: string | null,
) {
  return `${projectId || "unknown"}::${String(modelName || "")
    .trim()
    .toLowerCase()}`;
}

function getUnitLabel(unit: {
  lotBlock?: string | null;
  modelName?: string | null;
}) {
  return unit.lotBlock || unit.modelName || "Unit";
}

function isConfiguredTemplateValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value > 0;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function countConfiguredDesignValues(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (Array.isArray(value)) {
    return value.reduce(
      (sum, entry) => sum + countConfiguredDesignValues(entry),
      0,
    );
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce(
      (sum, entry) => sum + countConfiguredDesignValues(entry),
      0,
    );
  }

  return isConfiguredTemplateValue(value) ? 1 : 0;
}

function getInstallCostPreflight(
  resolvedTemplate: {
    id: number;
    version: string | null;
    meta?: unknown;
    communityModelInstallTasks?: Array<{
      builderTaskId: number | null;
      qty: number | null;
      installCostModel?: {
        unitCost: number | null;
      } | null;
    }>;
    project?: {
      builder?: {
        tasks?: Array<{
          id: number;
          installable?: boolean | null;
        }>;
      } | null;
    } | null;
  } | null,
) {
  if (!resolvedTemplate) {
    return {
      status: "missing" as const,
      reason: "No printable template found.",
      configuredTasks: 0,
      totalTasks: 0,
      totalEstimate: 0,
    };
  }

  const installableTasks = (
    resolvedTemplate.project?.builder?.tasks || []
  ).filter((task) => !!task.installable);
  if (!installableTasks.length) {
    return {
      status: "not-required" as const,
      reason: null,
      configuredTasks: 0,
      totalTasks: 0,
      totalEstimate: 0,
    };
  }

  const taskMap = new Map<number, number>();
  for (const task of resolvedTemplate.communityModelInstallTasks || []) {
    if (!task.builderTaskId) continue;
    const qty = Number(task.qty || 0);
    const unitCost = Number(task.installCostModel?.unitCost || 0);
    if (qty <= 0 || unitCost <= 0) continue;
    const current = taskMap.get(task.builderTaskId) || 0;
    taskMap.set(task.builderTaskId, +(current + qty * unitCost).toFixed(2));
  }

  const configuredTasks = taskMap.size;
  const totalTasks = installableTasks.length;
  const totalEstimate = +Array.from(taskMap.values())
    .reduce((sum, value) => sum + value, 0)
    .toFixed(2);
  const missingTaskCount = installableTasks.filter(
    (task) => !taskMap.has(task.id),
  ).length;

  return missingTaskCount === 0
    ? {
        status: "ready" as const,
        reason: null,
        configuredTasks,
        totalTasks,
        totalEstimate,
      }
    : {
        status:
          configuredTasks > 0 ? ("partial" as const) : ("missing" as const),
        reason:
          missingTaskCount === 1
            ? "1 builder task is missing install-cost setup."
            : `${missingTaskCount} builder tasks are missing install-cost setup.`,
        configuredTasks,
        totalTasks,
        totalEstimate,
      };
}

export async function getProjectUnitPrintPreflight(
  ctx: TRPCContext,
  query: ProjectUnitPrintPreflightSchema,
) {
  const units = await ctx.db.homes.findMany({
    where: {
      id: {
        in: query.unitIds,
      },
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      lotBlock: true,
      modelName: true,
      projectId: true,
      communityTemplateId: true,
      communityTemplate: {
        select: {
          id: true,
          slug: true,
          version: true,
          meta: true,
          project: {
            select: {
              builder: {
                select: {
                  tasks: {
                    select: {
                      id: true,
                      installable: true,
                    },
                  },
                },
              },
            },
          },
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
      tasks: {
        where: {
          produceable: true,
        },
        select: {
          producedAt: true,
          prodStartedAt: true,
          sentToProductionAt: true,
          productionStatus: true,
        },
      },
      _count: {
        select: {
          jobs: true,
        },
      },
    },
  });

  if (!units.length) {
    return {
      units: [],
      readyUnitIds: [],
      summary: {
        totalUnits: 0,
        readyUnits: 0,
        printableUnits: 0,
        productionEligibleUnits: 0,
        missingInstallCostUnits: 0,
        partialInstallCostUnits: 0,
        missingTemplateUnits: 0,
        emptyTemplateUnits: 0,
        productionActiveUnits: 0,
      },
      missingInstallCosts: [],
      missingTemplates: [],
    };
  }

  const fallbackTemplates = await ctx.db.communityModels.findMany({
    where: {
      OR: units.map((unit) => ({
        projectId: unit.projectId,
        modelName: unit.modelName || undefined,
      })),
    },
    select: {
      id: true,
      slug: true,
      version: true,
      meta: true,
      modelName: true,
      projectId: true,
      pivot: {
        select: {
          meta: true,
        },
      },
      project: {
        select: {
          builder: {
            select: {
              tasks: {
                select: {
                  id: true,
                  installable: true,
                },
              },
            },
          },
        },
      },
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
    },
  });

  const fallbackTemplateMap = new Map(
    fallbackTemplates.map((template) => [
      getProjectUnitPrintKey(template.projectId, template.modelName),
      template,
    ]),
  );

  const missingInstallCostMap = new Map<
    number,
    {
      modelId: number;
      templateSlug: string | null;
      templateVersion: string | null;
      modelName: string | null;
      projectName: string | null;
      builderName: string | null;
      units: Array<z.infer<typeof projectUnitPrintPreflightUnitSchema>>;
    }
  >();
  const missingTemplateMap = new Map<
    string,
    {
      projectName: string | null;
      builderName: string | null;
      modelName: string | null;
      units: Array<z.infer<typeof projectUnitPrintPreflightUnitSchema>>;
    }
  >();

  const preflightUnits = units.map((unit) => {
    const resolvedTemplate =
      unit.communityTemplate ||
      fallbackTemplateMap.get(
        getProjectUnitPrintKey(unit.projectId, unit.modelName),
      ) ||
      null;
    const hasTemplate = !!resolvedTemplate?.id;
    const templateConfiguredCount = countConfiguredDesignValues(
      (resolvedTemplate?.meta as CommunityTemplateMeta | null)?.design,
    );
    const isTemplateEmpty = hasTemplate && templateConfiguredCount <= 0;
    const installCost = getInstallCostPreflight(resolvedTemplate);
    const activeProductionTasks = (unit.tasks || []).filter((task) => {
      const state = getProductionState(task);
      return state === "Queued" || state === "Started" || state === "Completed";
    });
    const hasProductionActive = activeProductionTasks.length > 0;
    const productionStatus = activeProductionTasks.length
      ? getProductionState(activeProductionTasks[0])
      : "Idle";
    const blockingReasons: string[] = [];
    const canPrint = hasTemplate && !isTemplateEmpty;
    const canSendToProduction =
      canPrint &&
      // installCost.status !== "missing" &&
      // installCost.status !== "partial" &&
      !hasProductionActive;

    if (!hasTemplate) {
      blockingReasons.push("Template not found.");
      const key = getProjectUnitPrintKey(unit.projectId, unit.modelName);
      const current = missingTemplateMap.get(key) || {
        projectName: unit.project?.title || null,
        builderName: unit.project?.builder?.name || null,
        modelName: unit.modelName || null,
        units: [],
      };
      current.units.push({
        id: unit.id,
        slug: unit.slug,
        lotBlock: unit.lotBlock,
      });
      missingTemplateMap.set(key, current);
    }

    if (isTemplateEmpty) {
      blockingReasons.push("Template is empty and will not be printed.");
    }

    if (
      hasTemplate &&
      (installCost.status === "missing" || installCost.status === "partial")
    ) {
      blockingReasons.push(installCost.reason || "Install cost is missing.");
      const current = missingInstallCostMap.get(resolvedTemplate.id) || {
        modelId: resolvedTemplate.id,
        templateSlug: resolvedTemplate.slug || null,
        templateVersion: resolvedTemplate.version || null,
        modelName: unit.modelName || null,
        projectName: unit.project?.title || null,
        builderName: unit.project?.builder?.name || null,
        units: [],
      };
      current.units.push({
        id: unit.id,
        slug: unit.slug,
        lotBlock: unit.lotBlock,
      });
      missingInstallCostMap.set(resolvedTemplate.id, current);
    }

    return {
      id: unit.id,
      slug: unit.slug,
      lotBlock: unit.lotBlock,
      modelName: unit.modelName,
      projectName: unit.project?.title || null,
      builderName: unit.project?.builder?.name || null,
      templateId: resolvedTemplate?.id || null,
      templateSlug: resolvedTemplate?.slug || null,
      templateVersion: (resolvedTemplate?.version || "v1") as "v1" | "v2",
      hasTemplate,
      templateConfiguredCount,
      isTemplateEmpty,
      installCostStatus: installCost.status,
      installCostReason: installCost.reason,
      installCostConfiguredTasks: installCost.configuredTasks,
      installCostTotalTasks: installCost.totalTasks,
      installCostTotalEstimate: installCost.totalEstimate,
      jobCount: unit._count?.jobs || 0,
      jobsHref: `/hrm/contractors/jobs?unitId=${unit.id}`,
      hasProductionActive,
      productionStatus,
      blockingReasons,
      canPrint,
      canSendToProduction,
      isReady: canSendToProduction,
      label: getUnitLabel(unit),
    };
  });

  const readyUnitIds = preflightUnits
    .filter((unit) => unit.canPrint)
    .map((unit) => unit.id);

  return {
    units: preflightUnits,
    readyUnitIds,
    summary: {
      totalUnits: preflightUnits.length,
      readyUnits: preflightUnits.filter((unit) => unit.isReady).length,
      printableUnits: preflightUnits.filter((unit) => unit.canPrint).length,
      productionEligibleUnits: preflightUnits.filter(
        (unit) => unit.canSendToProduction,
      ).length,
      productionActiveUnits: preflightUnits.filter(
        (unit) => unit.hasProductionActive,
      ).length,
      missingInstallCostUnits: preflightUnits.filter(
        (unit) => unit.installCostStatus === "missing",
      ).length,
      partialInstallCostUnits: preflightUnits.filter(
        (unit) => unit.installCostStatus === "partial",
      ).length,
      missingTemplateUnits: preflightUnits.filter((unit) => !unit.hasTemplate)
        .length,
      emptyTemplateUnits: preflightUnits.filter((unit) => unit.isTemplateEmpty)
        .length,
    },
    missingInstallCosts: Array.from(missingInstallCostMap.values()).map(
      (entry) => ({
        ...entry,
        unitIds: entry.units.map((unit) => unit.id),
        labels: entry.units.map((unit) => getUnitLabel(unit)),
      }),
    ),
    missingTemplates: Array.from(missingTemplateMap.values()).map((entry) => ({
      ...entry,
      unitIds: entry.units.map((unit) => unit.id),
      labels: entry.units.map((unit) => getUnitLabel(unit)),
    })),
  };
}

export async function sendProjectUnitsToProduction(
  ctx: TRPCContext,
  query: SendProjectUnitsToProductionSchema,
) {
  const dueDate = query.dueDate ? dayjs(query.dueDate).toDate() : null;

  const [tasksResult, unitsResult] = await ctx.db.$transaction([
    ctx.db.homeTasks.updateMany({
      where: {
        homeId: {
          in: query.unitIds,
        },
        produceable: true,
      },
      data: {
        productionDueDate: dueDate,
        sentToProductionAt: new Date(),
      },
    }),
    ctx.db.homes.updateMany({
      where: {
        id: {
          in: query.unitIds,
        },
      },
      data: {
        sentToProdAt: new Date(),
      },
    }),
  ]);

  return {
    updatedTasks: tasksResult.count,
    updatedUnits: unitsResult.count,
  };
}

export const getProjectFormSchema = z.object({
  projectId: z.number(),
});
export type GetProjectFormSchema = z.infer<typeof getProjectFormSchema>;

export async function getProjectForm(
  ctx: TRPCContext,
  query: GetProjectFormSchema,
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
      (j) => j.type?.toLowerCase() == jobType?.toLowerCase(),
    ).length;
    if (_count > 0 && byAvailability) {
      return;
    }
    if (
      jobType == "punchout" &&
      unit.jobs.filter(
        (j) => j.type?.toLowerCase() == ("installation" as JobType),
      ).length == 0
    )
      return;

    // if (isTestUnit) console.log(unit);
    let template: any = unit.homeTemplate as any;
    let communityTemplate: any = project.communityModels.find(
      (m) => m.modelName == unit.modelName,
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
