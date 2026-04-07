import type { TRPCContext } from "@api/trpc/init";
import { getUnitProductionStatus } from "@community/utils";
import type { Prisma } from "@gnd/db";
import { transformFilterDateToQuery } from "@gnd/utils";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";
import {
  communityInstllationFilters,
  communityProductionFilter,
  invoiceFilter,
  type GetProjectUnitsSchema,
} from "./project-units";

const invoiceTaskSelect = {
  id: true,
  taskUid: true,
  taskName: true,
  amountDue: true,
  amountPaid: true,
  checkNo: true,
  checkDate: true,
  createdAt: true,
  produceable: true,
  installable: true,
  sentToProductionAt: true,
  producedAt: true,
  productionDueDate: true,
} satisfies Prisma.HomeTasksSelect;

const unitInvoiceListTaskSelect = {
  amountDue: true,
  amountPaid: true,
  produceable: true,
  sentToProductionAt: true,
  producedAt: true,
  productionDueDate: true,
} satisfies Prisma.HomeTasksSelect;

const unitInvoiceSelect = {
  id: true,
  createdAt: true,
  lotBlock: true,
  lot: true,
  block: true,
  modelName: true,
  slug: true,
  search: true,
  projectId: true,
  homeTemplateId: true,
  communityTemplateId: true,
  tasks: {
    where: {
      deletedAt: null,
    },
    select: unitInvoiceListTaskSelect,
  },
  _count: {
    select: {
      jobs: true,
      tasks: true,
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
  communityTemplate: {
    select: {
      slug: true,
      version: true,
      id: true,
      pivot: {
        select: {
          modelCosts: {
            take: 1,
            select: {
              id: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.HomesSelect;

const unitInvoiceFormSelect = {
  id: true,
  createdAt: true,
  lotBlock: true,
  lot: true,
  block: true,
  modelName: true,
  slug: true,
  search: true,
  projectId: true,
  homeTemplateId: true,
  communityTemplateId: true,
  tasks: {
    where: {
      deletedAt: null,
    },
    select: invoiceTaskSelect,
  },
  _count: {
    select: {
      jobs: true,
      tasks: true,
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
  communityTemplate: {
    select: {
      slug: true,
      version: true,
      id: true,
    },
  },
} satisfies Prisma.HomesSelect;

export const getUnitInvoicesSchema = z
  .object({
    builderSlug: z.string().optional().nullable(),
    projectSlug: z.string().optional().nullable(),
    production: z.enum(communityProductionFilter).optional().nullable(),
    invoice: z.enum(invoiceFilter).optional().nullable(),
    installation: z.enum(communityInstllationFilters).optional().nullable(),
    dateRange: z.array(z.string().optional().nullable()).optional().nullable(),
  })
  .extend(paginationSchema.shape);
export type GetUnitInvoicesSchema = z.infer<typeof getUnitInvoicesSchema>;

export async function getUnitInvoices(
  ctx: TRPCContext,
  query: GetUnitInvoicesSchema,
) {
  const { db } = ctx;
  const model = db.homes;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereUnitInvoices(query),
    model,
    {
      sortFn,
    },
  );

  const data = await model.findMany({
    where,
    ...searchMeta,
    select: unitInvoiceSelect,
  });

  return response(
    data.map((item) => {
      const invoice = item.tasks.reduce(
        (acc, task) => {
          const paid = Number(task.amountPaid || 0);
          const due = Number(task.amountDue || 0);

          acc.due += due;
          if (paid >= 0) {
            acc.paid += paid;
          } else {
            acc.chargeBack += paid;
          }

          return acc;
        },
        {
          paid: 0,
          due: 0,
          chargeBack: 0,
        },
      );

      return {
        ...item,
        jobCount: item._count.jobs,
        invoiceTaskCount: item._count.tasks,
        production: getUnitProductionStatus(item),
        invoice,
      };
    }),
  );
}

export const unitInvoiceFormSchema = z.object({
  homeId: z.number(),
});

function dedupeInvoiceTasks<
  T extends {
    id: number;
    taskUid: string | null;
    taskName: string | null;
  },
>(tasks: T[]) {
  const taskMap = new Map<string, T>();
  const duplicateTaskIds: number[] = [];

  for (const task of tasks) {
    const key = task.taskUid || task.taskName || `task-${task.id}`;
    if (taskMap.has(key)) {
      duplicateTaskIds.push(task.id);
      continue;
    }
    taskMap.set(key, task);
  }

  return {
    tasks: Array.from(taskMap.values()),
    duplicateTaskIds,
  };
}

export async function getUnitInvoiceForm(
  ctx: TRPCContext,
  input: z.infer<typeof unitInvoiceFormSchema>,
) {
  const unit = await ctx.db.homes.findUniqueOrThrow({
    where: {
      id: input.homeId,
    },
    select: unitInvoiceFormSelect,
  });

  const { tasks, duplicateTaskIds } = dedupeInvoiceTasks(unit.tasks);
  const invoice = tasks.reduce(
    (acc, task) => {
      acc.amountDue += Number(task.amountDue || 0);
      acc.amountPaid += Number(task.amountPaid || 0);
      return acc;
    },
    {
      amountDue: 0,
      amountPaid: 0,
    },
  );

  return {
    ...unit,
    tasks,
    duplicateTaskIds,
    jobCount: unit._count.jobs,
    production: getUnitProductionStatus(unit),
    invoice,
  };
}

const unitInvoiceTaskInputSchema = z.object({
  id: z.number().nullable().optional(),
  taskUid: z.string().nullable().optional(),
  taskName: z.string().nullable().optional(),
  amountDue: z.coerce.number().nullable().optional(),
  amountPaid: z.coerce.number().nullable().optional(),
  checkNo: z.string().nullable().optional(),
  checkDate: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().nullable().optional(),
});

export const saveUnitInvoiceFormSchema = z.object({
  homeId: z.number(),
  duplicateTaskIds: z.array(z.number()).optional().default([]),
  tasks: z.array(unitInvoiceTaskInputSchema),
});

export async function saveUnitInvoiceForm(
  ctx: TRPCContext,
  input: z.infer<typeof saveUnitInvoiceFormSchema>,
) {
  const unit = await ctx.db.homes.findUniqueOrThrow({
    where: {
      id: input.homeId,
    },
    select: {
      id: true,
      projectId: true,
      search: true,
    },
  });

  const createTasks = input.tasks.filter((task) => !task.id && !task.taskUid);
  const updateTasks = input.tasks.filter((task) => !!task.id);

  if (input.duplicateTaskIds.length) {
    await ctx.db.homeTasks.deleteMany({
      where: {
        id: {
          in: input.duplicateTaskIds,
        },
      },
    });
  }

  if (createTasks.length) {
    await ctx.db.homeTasks.createMany({
      data: createTasks.map((task) => ({
        homeId: unit.id,
        projectId: unit.projectId,
        search: unit.search,
        meta: {},
        taskName: task.taskName || null,
        amountDue: Number(task.amountDue || 0),
        amountPaid: Number(task.amountPaid || 0),
        checkNo: task.checkNo || null,
        checkDate: task.checkDate || null,
        createdAt: task.createdAt || new Date(),
      })),
    });
  }

  if (updateTasks.length) {
    await Promise.all(
      updateTasks.map((task) =>
        ctx.db.homeTasks.update({
          where: {
            id: task.id!,
          },
          data: {
            taskName:
              task.taskUid && !task.taskName ? undefined : task.taskName || null,
            amountDue:
              task.taskUid &&
              (task.amountDue === null || task.amountDue === undefined)
                ? undefined
                : Number(task.amountDue || 0),
            amountPaid: Number(task.amountPaid || 0),
            checkNo: task.checkNo || null,
            checkDate: task.checkDate || null,
            createdAt: task.createdAt || undefined,
          },
        }),
      ),
    );
  }

  return {
    success: true,
  };
}

export const deleteUnitInvoiceTasksSchema = z.object({
  taskIds: z.array(z.number()).min(1),
});

export async function deleteUnitInvoiceTasks(
  ctx: TRPCContext,
  input: z.infer<typeof deleteUnitInvoiceTasksSchema>,
) {
  await ctx.db.homeTasks.deleteMany({
    where: {
      id: {
        in: input.taskIds,
      },
    },
  });

  return {
    success: true,
  };
}

function sortFn(
  sort,
  sortOrder,
):
  | Prisma.HomesOrderByWithRelationInput
  | Prisma.HomesOrderByWithRelationInput[]
  | undefined {
  switch (sort) {
    case "project":
      return {
        project: {
          title: sortOrder || "asc",
        },
      };
    case "date":
      return {
        createdAt: sortOrder || "desc",
      };
    case "lotBlock":
      return [
        {
          lot: sortOrder || "asc",
        },
        {
          block: sortOrder || "asc",
        },
      ];
  }

  return undefined;
}

function whereUnitInvoices(query: GetProjectUnitsSchema) {
  const where: Prisma.HomesWhereInput[] = [];

  for (const [k, v] of Object.entries(query)) {
    if (!v) continue;

    const value = v as any;
    switch (k as keyof GetProjectUnitsSchema) {
      case "q":
        where.push({
          OR: [
            {
              search: {
                contains: value,
              },
            },
            {
              modelName: {
                contains: value,
              },
            },
          ],
        });
        break;
      case "projectSlug":
        where.push({
          project: {
            slug: value,
          },
        });
        break;
      case "builderSlug":
        where.push({
          project: {
            builder: {
              slug: value,
            },
          },
        });
        break;
      case "invoice":
        switch (query.invoice) {
          case "has payment":
            where.push({
              tasks: {
                some: {
                  taskUid: {
                    not: null,
                  },
                  amountPaid: {
                    gt: 0,
                  },
                },
              },
            });
            break;
          case "no payment":
            where.push({
              tasks: {
                every: {
                  taskUid: {
                    not: null,
                  },
                  OR: [
                    {
                      amountPaid: {
                        equals: 0,
                      },
                    },
                    {
                      amountPaid: null,
                    },
                    {
                      amountPaid: undefined,
                    },
                  ],
                },
              },
            });
            break;
        }
        break;
      case "installation":
        if (value === "Submitted") {
          where.push({
            jobs: {
              some: {},
            },
          });
        }
        if (value === "No Submission") {
          where.push({
            jobs: {
              none: {},
            },
          });
        }
        break;
      case "production":
        if (value === "started") {
          where.push({
            tasks: {
              some: {
                produceable: true,
                producedAt: {
                  not: null,
                },
              },
            },
            jobs: {
              none: {},
            },
          });
        }
        if (value === "queued") {
          where.push({
            tasks: {
              some: {
                produceable: true,
                sentToProductionAt: {
                  not: null,
                },
              },
            },
            jobs: {
              none: {},
            },
          });
        }
        if (value === "idle") {
          where.push({
            tasks: {
              none: {
                produceable: true,
                OR: [
                  {
                    sentToProductionAt: {
                      not: null,
                    },
                  },
                  {
                    producedAt: {
                      not: null,
                    },
                  },
                ],
              },
            },
            jobs: {
              none: {},
            },
          });
        }
        if (value === "completed") {
          where.push({
            OR: [
              {
                jobs: {
                  some: {},
                },
              },
              {
                AND: [
                  {
                    tasks: {
                      some: {
                        produceable: true,
                      },
                    },
                  },
                  {
                    NOT: {
                      tasks: {
                        some: {
                          produceable: true,
                          producedAt: null,
                        },
                      },
                    },
                  },
                ],
              },
            ],
          });
        }
        break;
      case "dateRange":
        where.push({
          createdAt: transformFilterDateToQuery(query.dateRange),
        });
        break;
    }
  }

  return composeQuery(where);
}
