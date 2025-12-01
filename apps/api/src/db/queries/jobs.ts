import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import z from "zod";

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
