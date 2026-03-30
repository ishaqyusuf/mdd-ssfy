import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { transformFilterDateToQuery } from "@gnd/utils";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

export const unitProductionStatusFilter = [
  "idle",
  "queued",
  "started",
  "completed",
] as const;

export const getUnitProductionsSchema = z
  .object({
    ids: z.array(z.number()).optional().nullable(),
    builderSlug: z.string().optional().nullable(),
    projectSlug: z.string().optional().nullable(),
    taskNames: z.array(z.string()).optional().nullable(),
    production: z.enum(unitProductionStatusFilter).optional().nullable(),
    dateRange: z.array(z.string().optional().nullable()).optional().nullable(),
  })
  .extend(paginationSchema.shape);

export type GetUnitProductionsSchema = z.infer<typeof getUnitProductionsSchema>;

export const getUnitProductionOverviewSchema = z.object({
  id: z.number(),
});

export type GetUnitProductionOverviewSchema = z.infer<
  typeof getUnitProductionOverviewSchema
>;

const unitProductionSelect = {
  id: true,
  createdAt: true,
  taskName: true,
  taskUid: true,
  search: true,
  productionStatus: true,
  prodStartedAt: true,
  producedAt: true,
  sentToProductionAt: true,
  productionDueDate: true,
  homeId: true,
  projectId: true,
  home: {
    select: {
      id: true,
      slug: true,
      lotBlock: true,
      lot: true,
      block: true,
      modelName: true,
      search: true,
      _count: {
        select: {
          jobs: true,
        },
      },
    },
  },
  project: {
    select: {
      slug: true,
      title: true,
      builder: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.HomeTasksSelect;

type UnitProductionRow = Prisma.HomeTasksGetPayload<{
  select: typeof unitProductionSelect;
}>;

type UnitProductionStateInput = Pick<
  UnitProductionRow,
  | "producedAt"
  | "prodStartedAt"
  | "productionStatus"
  | "sentToProductionAt"
  | "home"
>;

type UnitProductionMappedInput = Pick<
  UnitProductionRow,
  | "id"
  | "createdAt"
  | "taskName"
  | "taskUid"
  | "productionStatus"
  | "prodStartedAt"
  | "producedAt"
  | "sentToProductionAt"
  | "productionDueDate"
  | "home"
  | "project"
>;

function getUnitTaskProductionState(task: UnitProductionStateInput) {
  if (task.home?._count?.jobs) return "Completed";
  if (task.producedAt) return "Completed";
  if (
    task.prodStartedAt ||
    task.productionStatus?.includes("Start") ||
    task.productionStatus?.includes("Progress")
  ) {
    return "Started";
  }
  if (task.sentToProductionAt) return "Queued";
  return "Idle";
}

function isPastDue(task: Pick<UnitProductionRow, "productionDueDate" | "producedAt" | "home">) {
  if (task.producedAt || task.home?._count?.jobs) return false;
  if (!task.productionDueDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return task.productionDueDate < today;
}

function mapUnitProduction(task: UnitProductionMappedInput) {
  const status = getUnitTaskProductionState(task);
  const overdue = isPastDue(task);

  return {
    id: task.id,
    createdAt: task.createdAt,
    taskName: task.taskName,
    taskUid: task.taskUid,
    productionStatus: task.productionStatus,
    prodStartedAt: task.prodStartedAt,
    producedAt: task.producedAt,
    sentToProductionAt: task.sentToProductionAt,
    productionDueDate: task.productionDueDate,
    jobCount: task.home?._count?.jobs ?? 0,
    status,
    overdue,
    home: task.home,
    project: task.project,
  };
}

function buildSummary(items: ReturnType<typeof mapUnitProduction>[]) {
  return items.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.home?.id) acc.homeIds.add(item.home.id);
      switch (item.status.toLowerCase()) {
        case "queued":
          acc.queued += 1;
          break;
        case "started":
          acc.started += 1;
          break;
        case "completed":
          acc.completed += 1;
          break;
        default:
          acc.idle += 1;
          break;
      }
      if (item.overdue) acc.pastDue += 1;
      return acc;
    },
    {
      total: 0,
      queued: 0,
      started: 0,
      completed: 0,
      idle: 0,
      pastDue: 0,
      homeIds: new Set<number>(),
    },
  );
}

export async function getUnitProductions(
  ctx: TRPCContext,
  query: GetUnitProductionsSchema,
) {
  const { db } = ctx;
  const model = db.homeTasks;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereUnitProductions(query),
    model,
    {
      sortFn,
    },
  );

  const rows = await model.findMany({
    where,
    ...searchMeta,
    select: unitProductionSelect,
  });

  const data = rows.map(mapUnitProduction);
  const result = await response(data);
  const summary = buildSummary(data);

  return {
    ...result,
    summary: {
      total: summary.total,
      units: summary.homeIds.size,
      idle: summary.idle,
      queued: summary.queued,
      started: summary.started,
      completed: summary.completed,
      pastDue: summary.pastDue,
    },
  };
}

export async function getUnitProductionSummary(
  ctx: TRPCContext,
  query: Omit<GetUnitProductionsSchema, "cursor" | "size" | "sort">,
) {
  const rows = await ctx.db.homeTasks.findMany({
    where: whereUnitProductions(query),
    select: unitProductionSelect,
  });

  const summary = buildSummary(rows.map(mapUnitProduction));

  return {
    total: summary.total,
    units: summary.homeIds.size,
    idle: summary.idle,
    queued: summary.queued,
    started: summary.started,
    completed: summary.completed,
    pastDue: summary.pastDue,
  };
}

export async function getUnitProductionOverview(
  ctx: TRPCContext,
  query: GetUnitProductionOverviewSchema,
) {
  const task = await ctx.db.homeTasks.findFirstOrThrow({
    where: {
      id: query.id,
      deletedAt: null,
    },
    select: {
      id: true,
      createdAt: true,
      taskName: true,
      taskUid: true,
      productionStatus: true,
      prodStartedAt: true,
      producedAt: true,
      sentToProductionAt: true,
      productionDueDate: true,
      checkDate: true,
      amountDue: true,
      amountPaid: true,
      homeId: true,
      projectId: true,
      home: {
        select: {
          id: true,
          slug: true,
          lotBlock: true,
          modelName: true,
          address: true,
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
              status: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              jobs: true,
            },
          },
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
    },
  });

  const overview = mapUnitProduction(task);

  return {
    ...overview,
    taskUid: task.taskUid,
    checkDate: task.checkDate,
    amountDue: task.amountDue,
    amountPaid: task.amountPaid,
    home: task.home,
    project: task.project,
    timeline: [
      { label: "Created", value: task.createdAt },
      { label: "Queued", value: task.sentToProductionAt },
      { label: "Started", value: task.prodStartedAt },
      { label: "Completed", value: task.producedAt },
    ],
    jobs:
      task.home?.jobs.map((job) => ({
        id: job.id,
        createdAt: job.createdAt,
        status: job.status,
        assignee: job.user?.name || "Unassigned",
      })) ?? [],
  };
}

function sortFn(
  sort: string,
  sortOrder: string,
):
  | Prisma.HomeTasksOrderByWithRelationInput
  | Prisma.HomeTasksOrderByWithRelationInput[]
  | undefined {
  switch (sort) {
    case "date":
      return {
            createdAt: sortOrder === "asc" ? "asc" : "desc",
      };
    case "dueDate":
      return {
        productionDueDate: sortOrder === "desc" ? "desc" : "asc",
      };
    case "project":
      return {
        project: {
          title: sortOrder === "desc" ? "desc" : "asc",
        },
      };
    case "unit":
      return [
        {
          home: {
            lot: sortOrder === "desc" ? "desc" : "asc",
          },
        },
        {
          home: {
            block: sortOrder === "desc" ? "desc" : "asc",
          },
        },
      ];
    case "task":
      return {
        taskName: sortOrder === "desc" ? "desc" : "asc",
      };
    default:
      return undefined;
  }
}

function whereUnitProductions(query: Partial<GetUnitProductionsSchema>) {
  const where: Prisma.HomeTasksWhereInput[] = [
    {
      produceable: true,
    },
  ];

  for (const [key, rawValue] of Object.entries(query)) {
    if (
      rawValue === undefined ||
      rawValue === null ||
      rawValue === "" ||
      (Array.isArray(rawValue) && rawValue.length === 0)
    ) {
      continue;
    }

    switch (key as keyof GetUnitProductionsSchema) {
      case "q": {
        const value = String(rawValue);
        const q = { contains: value };
        where.push({
          OR: [
            {
              search: q,
            },
            {
              taskName: q,
            },
            {
              home: {
                search: q,
              },
            },
            {
              home: {
                modelName: q,
              },
            },
            {
              home: {
                lotBlock: q,
              },
            },
            {
              project: {
                title: q,
              },
            },
          ],
        });
        break;
      }
      case "builderSlug":
        where.push({
          project: {
            builder: {
              slug: String(rawValue),
            },
          },
        });
        break;
      case "ids":
        where.push({
          id: {
            in: (rawValue as number[]).map((value) => Number(value)),
          },
        });
        break;
      case "projectSlug":
        where.push({
          project: {
            slug: String(rawValue),
          },
        });
        break;
      case "taskNames":
        where.push({
          taskName: {
            in: (rawValue as string[]).filter(Boolean),
          },
        });
        break;
      case "dateRange":
        where.push({
          productionDueDate: transformFilterDateToQuery(
            rawValue as string[] | null | undefined,
          ),
        });
        break;
      case "production": {
        const status = String(rawValue);
        if (status === "completed") {
          where.push({
            OR: [
              {
                producedAt: {
                  not: null,
                },
              },
              {
                home: {
                  jobs: {
                    some: {},
                  },
                },
              },
            ],
          });
          break;
        }

        if (status === "started") {
          where.push({
            producedAt: null,
            home: {
              jobs: {
                none: {},
              },
            },
            OR: [
              {
                prodStartedAt: {
                  not: null,
                },
              },
              {
                productionStatus: {
                  contains: "Start",
                },
              },
              {
                productionStatus: {
                  contains: "Progress",
                },
              },
            ],
          });
          break;
        }

        if (status === "queued") {
          where.push({
            producedAt: null,
            prodStartedAt: null,
            sentToProductionAt: {
              not: null,
            },
            home: {
              jobs: {
                none: {},
              },
            },
          });
          break;
        }

        if (status === "idle") {
          where.push({
            producedAt: null,
            prodStartedAt: null,
            sentToProductionAt: null,
            home: {
              jobs: {
                none: {},
              },
            },
          });
        }
        break;
      }
      default:
        break;
    }
  }

  return composeQuery(where);
}
