import type { TRPCContext } from "@api/trpc/init";
import type { JobMeta } from "@community/types";
import type { Prisma } from "@gnd/db";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import z from "zod";
import { getSetting } from "./settings";
import { formatLargeNumber } from "@gnd/utils/format";
export const getJobsSchema = z.object({}).extend(paginationSchema.shape);
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
  return await getSetting(ctx, "install-price-chart");
}

export const getJobAnalyticsSchema = z.object({});
export type GetJobAnalyticsSchema = z.infer<typeof getJobAnalyticsSchema>;

export async function getJobAnalytics(
  ctx: TRPCContext,
  query: GetJobAnalyticsSchema
) {
  const { db } = ctx;

  const completedPromise = db.jobs.count({
    where: { status: "Completed" },
  });

  const inProgressPromise = db.jobs.count({
    where: { status: "In Progress" },
  });

  const paidPromise = db.jobs.count({
    // _sum: {
    //   amount: true,
    // },
    where: {
      payment: null,
    },
  });

  const pendingPaymentsPromise = db.jobs.count({
    // _sum: {
    //   amount: true,
    // },
    where: {
      payment: {},
    },
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
createJob: publicProcedure
      .input(createJobSchema)
      .mutation(async (props) => {
        return createJob(props.ctx, props.input);
      }),
*/
export const createJobSchema = z.object({
  id: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  projectId: z.number().optional().nullable(),
  homeId: z.number().optional().nullable(),
  coWorkerId: z.number().optional().nullable(),
  tasks: z.record(
    z.string(),
    z.object({
      qty: z.number().optional().nullable(),
      maxQty: z.number().optional().nullable(),
      rate: z.number(),
    })
  ),
});
export type CreateJobSchema = z.infer<typeof createJobSchema>;

export async function createJob(ctx: TRPCContext, query: CreateJobSchema) {
  const { db } = ctx;
}
