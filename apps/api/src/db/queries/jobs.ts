import type { TRPCContext } from "@api/trpc/init";
import type { InstallCostMeta, JobMeta, JobStatus } from "@community/types";
import type { Prisma } from "@gnd/db";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import z from "zod";
import { getSetting } from "./settings";
import { formatLargeNumber } from "@gnd/utils/format";
import {
  consoleLog,
  generateRandomString,
  nextId,
  padStart,
  sum,
} from "@gnd/utils";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  eachDayOfInterval,
  format,
  formatDate,
} from "date-fns";
import { generateControlId, generateJobId } from "@gnd/community/utils/job";
import { Notifications } from "@gnd/notifications";
import { JOBS_SHOW_OPTIONS } from "@community/constants";
import {
  createJobSchema,
  type CreateJobSchema,
} from "@community/create-job-schema";
export const getJobsSchema = z
  .object({
    userId: z.number().optional().nullable(),
    jobId: z.number().optional().nullable(),
    show: z.enum(JOBS_SHOW_OPTIONS).optional().nullable(),
    contractor: z.string().optional().nullable(),
    project: z.string().optional().nullable(),
    unitId: z.number().optional().nullable(),
  })
  .extend(paginationSchema.shape);
export type GetJobsSchema = z.infer<typeof getJobsSchema>;

export async function getJobs(ctx: TRPCContext, query: GetJobsSchema) {
  const { db } = ctx;
  const model = db.jobs;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereJobs(query),
    model,
  );
  const data = await model.findMany({
    where,
    ...searchMeta,
    select: {
      meta: true,
      id: true,
      status: true,
      note: true,
      statusDate: true,
      createdAt: true,
      title: true,
      subtitle: true,
      amount: true,
      controlId: true,
      isCustom: true,
      builderTaskId: true,
      coWorker: {
        select: {
          name: true,
          id: true,
        },
      },
      user: {
        select: {
          name: true,
          id: true,
        },
      },
      adminNote: true,
      payment: {
        select: {
          amount: true,
          id: true,
        },
      },
      description: true,
      project: {
        select: {
          title: true,
          id: true,
          builder: {
            select: {
              name: true,
            },
          },
        },
      },
      home: {
        select: {
          lotBlock: true,
          id: true,
          modelName: true,
          communityTemplateId: true,
        },
      },
      jobInstallTasks: {
        select: {
          id: true,
          qty: true,
          maxQty: true,
          rate: true,
          total: true,
          communityModelInstallTask: {
            select: {
              installCostModel: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return await response(
    data.map(
      ({
        meta: _meta,
        adminNote,
        note,
        amount,
        createdAt,
        description,
        home,
        id,
        payment,
        project,
        status,
        statusDate,
        subtitle,
        title,
        user,
        coWorker,
        controlId,
        isCustom,
        ...rest
      }) => {
        const meta = _meta as any as JobMeta;
        // const {
        //   additional_cost,
        //   additionalCostReason,
        //   addon,
        //   costData,
        //   taskCost,
        // } = meta2 || {};
        return {
          jobId: `#J-${padStart(id, 5, "0")}`,
          controlId,
          isCustom,
          adminNote,
          amount,
          createdAt,
          description,
          home,
          note,
          id,
          payment,
          project,
          status: status as JobStatus,
          statusDate,
          subtitle,
          title,
          user,
          coWorker,
          meta,
          ...rest,
        };
      },
    ),
  );
}
function whereJobs(query: GetJobsSchema) {
  const where: Prisma.JobsWhereInput[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (!v) continue;
    const value = v as any;
    switch (k as keyof GetJobsSchema) {
      case "q":
        const q = { contains: v as string };
        where.push({
          OR: [],
        });
        break;
      case "userId":
        where.push({
          userId: value,
        });
        break;
      case "jobId":
        where.push({
          id: value,
        });
        break;
      case "unitId":
        where.push({
          homeId: value,
        });
        break;
      case "show":
        switch (query.show) {
          case "custom":
            where.push({
              isCustom: true,
            });
            break;
        }
        break;
    }
  }
  return composeQuery(where);
}

export const getInstallCostsSchema = z.object({});
export type GetInstallCostsSchema = z.infer<typeof getInstallCostsSchema>;

export async function getInstallCosts(
  ctx: TRPCContext,
  query?: GetInstallCostsSchema,
) {
  const { db } = ctx;
  const res = await getSetting<InstallCostMeta>(ctx, "install-price-chart");
  // res.data.list[0].
  return res;
}

export const getJobAnalyticsSchema = z.object({});
export type GetJobAnalyticsSchema = z.infer<typeof getJobAnalyticsSchema>;

export async function getJobAnalytics(
  ctx: TRPCContext,
  query: GetJobAnalyticsSchema,
) {
  const { db } = ctx;

  // return {
  //   completed: 0,
  //   inProgress: 0,
  //   paid: 0,
  //   pendingPayments: 0, // formatLargeNumber(pendingPayments),
  // };
  const completedPromise = db.jobs.count({
    where: {
      OR: [
        { status: "Completed" },
        {
          payment: {},
        },
      ],
      userId: ctx.userId,
    },
  });

  const inProgressPromise = db.jobs.count({
    where: { status: "Submitted", userId: ctx.userId },
  });

  const pendingPaymentsPromise = db.jobs.count({
    // _sum: {
    //   amount: true,
    // },
    where: {
      payment: null,
      userId: ctx.userId,
    },
  });

  const paidPromise = db.jobs.count({
    // _sum: {
    //   amount: true,
    // },
    where: { userId: ctx.userId, payment: {} },
  });

  const [completed, inProgress, paidAggregation, pendingPaymentsAggregation] =
    await Promise.all([
      completedPromise,
      inProgressPromise,
      paidPromise,
      pendingPaymentsPromise,
    ]);

  const paid =
    paidAggregation ||
    // _sum.amount
    0;
  const pendingPayments = pendingPaymentsAggregation || 0;

  return {
    completed,
    inProgress,
    paid,
    pendingPayments: formatLargeNumber(pendingPayments),
  };
}

export async function createJob(ctx: TRPCContext, query: CreateJobSchema) {
  // return {};
  const { db } = ctx;
  if (query.isCustom) {
    query.tasks = {};
    // query.addon = 0;
    // query.status = '';
  }

  const taskCost = sum(
    Object.entries(query.tasks).map(([k, v]) => sum([+v.qty! * +v.cost])),
  );
  const meta: JobMeta = {
    taskCost,
    additional_cost: query.additionalCost!,
    additionalCostReason: query.additionalReason!,
    addon: query.addon! || 0, // !query.homeId ? 0 : query.addon!,
    costData: query.tasks as any,
  };
  const amount = sum([
    sum([
      query.isCustom || !query.homeId ? 0 : meta.addon,
      meta.taskCost,
      meta.additional_cost,
    ]) / (query.coWorker?.id ? 2 : 1),
  ]);
  const controlId = query.id ? query.controlId : generateControlId();
  if (!controlId) throw new Error("Unable to proceed");
  const data = {
    // id: jobId,
    // status: query?.status || "Submitted",
    status: query.status!,
    statusDate: new Date(),
    amount,
    description: query.description,
    note: query.note,
    meta: meta as any,
    title: query.title,
    subtitle: query.subtitle,
  } as Prisma.JobsCreateManyInput;
  const createData = {
    userId: query?.worker?.id || ctx.userId!,
    type: query.type as any,
    coWorkerId: query.coWorker?.id,
    homeId: query.homeId!,
    projectId: query.projectId!,
    controlId,
    isCustom: query.isCustom,
  } as Prisma.JobsCreateManyInput;
  if (!query.id) {
    let _data = {
      ...data,
      ...createData,
    };
    const jobId = (query.id = await nextId(db.jobs));
    _data.id = jobId;
    const result = await db.jobs.createMany({
      data: !query.coWorker?.id
        ? [_data]
        : [
            _data,
            {
              ..._data,
              id: undefined,
              userId: query.coWorker?.id!,
              coWorkerId: ctx.userId!,
              // note: query.note,
            },
          ],
    });
    const notifications = new Notifications(db);
    if (query.mode == "assign") {
      await notifications.create("job_assigned", {
        jobId,
        assignedToId: query?.worker?.id!,
      });
    }
    // await saveNote(
    //   ctx.db,
    //   {
    //     headline: query?.mode == "assign" ? "Job Assigned" : "Job Submitted",
    //     note: generateJobId(jobId),
    //     subject:
    //       query?.mode == "assign" ? `New job assignment` : `New job submission`,
    //     tags: [
    //       {
    //         tagName: "jobControlId",
    //         tagValue: controlId,
    //       },
    //       {
    //         tagName: "jobId",
    //         tagValue: String(jobId),
    //       },
    //     ],
    //   },
    //   ctx.userId!,
    // );
  } else {
    const result = await db.jobs.updateMany({
      where: {
        id: {
          in: [query.id!, query.coWorkerJobId!]?.filter(Boolean),
        },
      },
      data: {
        ...data,
      },
    });
  }
  return await getJobForm(ctx, {
    controlId,
  });
}
export const getJobFormSchema = z.object({
  controlId: z.string(),
});
export type GetJobFormSchema = z.infer<typeof getJobFormSchema>;

export async function getJobForm(ctx: TRPCContext, query: GetJobFormSchema) {
  const { db } = ctx;
  const [main, co] = await db.jobs.findMany({
    where: {
      controlId: query.controlId,
    },
    include: {
      user: true,
    },
  });
  if (!main) throw new Error("Job not found");
  const mainMeta: JobMeta = main.meta as any;
  return {
    id: main.id,
    description: main.description!,
    title: main.title!,
    subtitle: main.subtitle,
    status: main.status,
    controlId: main.controlId,
    worker: {
      id: main.userId,
      name: main.user?.name,
    },
    coWorkerJobId: co?.id,
    type: main.type as any,
    homeId: main.homeId,
    additionalCost: mainMeta?.additional_cost,
    note: main?.note,
    additionalReason: mainMeta?.additionalCostReason,
    addon: mainMeta?.addon,
    date: main?.createdAt,
    coWorker: co
      ? {
          id: co?.user?.id,
          name: co?.user?.name,
        }
      : null,
    projectId: main.projectId,
    tasks: mainMeta?.costData,
  } satisfies CreateJobSchema;
}
export const earningAnalyticsSchema = z.object({
  // : z.string(),
});
export type EarningAnalyticsSchema = z.infer<typeof earningAnalyticsSchema>;

export async function earningAnalytics(
  ctx: TRPCContext,
  query: EarningAnalyticsSchema,
) {
  const { db } = ctx;
  const now = new Date();

  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);

  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const [thisMonthJobs, lastMonthJobs] = await Promise.all([
    db.jobs.findMany({
      where: {
        userId: ctx.userId,
        status: {
          in: ["PAID", "SUBMITTED"],
        },
        createdAt: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      select: { amount: true, createdAt: true },
    }),

    db.jobs.findMany({
      where: {
        userId: ctx.userId,
        status: {
          in: ["PAID", "SUBMITTED"],
        },
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      select: { amount: true },
    }),
  ]);
  const earning = thisMonthJobs.reduce((s, j) => s + j.amount, 0);
  const lastMonthEarning = lastMonthJobs.reduce((s, j) => s + j.amount, 0);
  const percentageVsLastMonth =
    lastMonthEarning === 0
      ? 100
      : Math.round(((earning - lastMonthEarning) / lastMonthEarning) * 100);
  const days = eachDayOfInterval({
    start: thisMonthStart,
    end: thisMonthEnd,
  });

  const data = days.map((day) => {
    return thisMonthJobs
      .filter(
        (j) => format(j.createdAt!, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
      )
      .reduce((s, j) => s + j.amount, 0);
  });
  return {
    earning,
    percentageVsLastMonth,
    data,
  };
}

/*
adminAnalytics: publicProcedure
      .input(adminAnalyticsSchema)
      .query(async (props) => {
        return adminAnalytics(props.ctx, props.input);
      }),
*/
export const adminAnalyticsSchema = z.object({
  // : z.string(),
});
export type AdminAnalyticsSchema = z.infer<typeof adminAnalyticsSchema>;

export async function adminAnalytics(
  ctx: TRPCContext,
  query: AdminAnalyticsSchema,
) {
  const { db } = ctx;

  return {
    jobsInProgress: 0,
    jobsPendingApproval: 0,
    approvedThisMonth: 0,
  };
}
