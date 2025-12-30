import type { TRPCContext } from "@api/trpc/init";
import type { InstallCostMeta, JobMeta } from "@community/types";
import type { Prisma } from "@gnd/db";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import z from "zod";
import { getSetting } from "./settings";
import { formatLargeNumber } from "@gnd/utils/format";
import { sum } from "@gnd/utils";
export const getJobsSchema = z
  .object({
    userId: z.number().optional().nullable(),
  })
  .extend(paginationSchema.shape);
export type GetJobsSchema = z.infer<typeof getJobsSchema>;

export async function getJobs(ctx: TRPCContext, query: GetJobsSchema) {
  const { db } = ctx;
  const model = db.jobs;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereJobs(query),
    model
  );
  const data = await model.findMany({
    where,
    ...searchMeta,
    select: {
      meta: true,
      id: true,
      status: true,
      statusDate: true,
      createdAt: true,
      title: true,
      subtitle: true,
      amount: true,
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
        },
      },
      home: {
        select: {
          lotBlock: true,
          id: true,
          modelName: true,
        },
      },
    },
  });
  return await response(
    data.map((d) => ({
      ...d,
      meta: d.meta as any as JobMeta,
    }))
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
    }
  }
  return composeQuery(where);
}

export const getInstallCostsSchema = z.object({});
export type GetInstallCostsSchema = z.infer<typeof getInstallCostsSchema>;

export async function getInstallCosts(
  ctx: TRPCContext,
  query: GetInstallCostsSchema
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
  query: GetJobAnalyticsSchema
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

/*

*/
export const createJobSchema = z.object({
  id: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  title: z.string(),
  subtitle: z.string().optional().nullable(),
  type: z
    .enum(["punchout", "installation", "Deco-Shutter"])
    .optional()
    .nullable(),
  note: z.string().optional().nullable(),
  projectId: z.number().optional().nullable(),
  homeId: z.number().optional().nullable(),
  additionalCost: z.number().optional().nullable(),
  includeAdditionalCharges: z.boolean().optional().nullable(),
  additionalReason: z.string().optional().nullable(),
  addon: z.number().optional().nullable(),
  // coWorkerId: z.number().optional().nullable(),
  coWorker: z
    .object({
      id: z.number().optional().nullable(),
      name: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  tasks: z.record(
    z.string(),
    z
      .object({
        qty: z.number().optional().nullable(),
        maxQty: z.number().optional().nullable(),
        cost: z.number(),
      })
      .refine(
        (data) =>
          data.qty == null || data.maxQty == null || data.qty <= data.maxQty,
        { message: "qty cannot be greater than maxQty", path: ["qty"] }
      )
  ),
});
export type CreateJobSchema = z.infer<typeof createJobSchema>;

export async function createJob(ctx: TRPCContext, query: CreateJobSchema) {
  // return {};
  const { db } = ctx;
  const taskCost = sum(
    Object.entries(query.tasks).map(([k, v]) => sum([+v.qty! * +v.cost]))
  );
  const meta: JobMeta = {
    taskCost,
    additional_cost: query.additionalCost!,
    addon: !query.homeId ? 0 : query.addon!,
    costData: query.tasks as any,
  };
  const amount = sum([
    sum([meta.addon, meta.taskCost, meta.additional_cost]) /
      (query.coWorker?.id ? 2 : 1),
  ]);
  if (!query.id) {
    const data = {
      status: "Submitted",
      statusDate: new Date(),
      userId: ctx.userId!,
      amount,
      type: query.type as any,
      coWorkerId: query.coWorker?.id,
      description: query.description,
      homeId: query.homeId!,
      projectId: query.projectId!,
      note: query.note,
      meta,
      title: query.title,
      subtitle: query.subtitle,
    };
    await db.jobs.createMany({
      data: !query.coWorker?.id
        ? [data]
        : [
            data,
            {
              ...data,
              userId: query.coWorker?.id!,
              coWorkerId: ctx.userId!,
              note: query.additionalReason,
            },
          ],
    });
  }
}
