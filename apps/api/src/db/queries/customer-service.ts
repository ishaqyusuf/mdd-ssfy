import type { TRPCContext } from "../../trpc/init";
import { z } from "zod";
import { composeQueryData, composeQuery } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import type { Prisma } from "@gnd/db";
import { transformFilterDateToQuery } from "@gnd/utils";
import type { id } from "date-fns/locale";

export const getCustomerServicesSchema = z
  .object({
    q: z.string().optional(),
    dateRange: z.string().optional(),
    status: z.string().optional().nullable(),
    // Add other filter properties here
  })
  .extend(paginationSchema.shape);

export type GetCustomerServicesSchema = z.infer<
  typeof getCustomerServicesSchema
>;

export async function getCustomerServices(
  ctx: TRPCContext,
  query: GetCustomerServicesSchema,
) {
  const { db } = ctx;
  const model = db.workOrders;

  const { response, searchMeta } = await composeQueryData(
    query,
    whereCustomerServices(query),
    model,
  );

  const data = await model.findMany({
    where: whereCustomerServices(query),
    // select: {}
    // include: {}
    ...searchMeta,
    include: {
      tech: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return await response(
    data.map((item) => {
      return {
        ...item,
      };
    }),
  );
}

function whereCustomerServices(query: GetCustomerServicesSchema) {
  const where: Prisma.WorkOrdersWhereInput[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (!v) continue;

    switch (k as keyof GetCustomerServicesSchema) {
      case "q":
        where.push({
          OR: [
            { description: { contains: v as any } },
            { homeOwner: { contains: v as any } },
            { projectName: { contains: v as any } },
            { homePhone: { contains: v as any } },
          ],
        });
        break;
      case "dateRange":
        where.push({
          createdAt: transformFilterDateToQuery(query.dateRange),
        });
        break;
      case "status":
        where.push({
          status: v as any,
        });
        break;
    }
  }
  return composeQuery(where);
}

export const assignWorkOrderSchema = z.object({
  userId: z.number(),
  woId: z.number(),
});
export type AssignWorkOrderSchema = z.infer<typeof assignWorkOrderSchema>;

export async function assignWorkOrder(
  ctx: TRPCContext,
  data: AssignWorkOrderSchema,
) {
  const { db } = ctx;
  await db.workOrders.update({
    where: {
      id: data.woId,
    },
    data: {
      tech: {
        connect: {
          id: data.userId,
        },
      },
    },
  });
}

export const deleteWorkOrderSchema = z.object({
  id: z.number(),
});
export type DeleteWorkOrderSchema = z.infer<typeof deleteWorkOrderSchema>;

export async function deleteWorkOrder(
  ctx: TRPCContext,
  query: DeleteWorkOrderSchema,
) {
  const { db } = ctx;
  await db.workOrders.update({
    where: { id: query.id },
    data: {
      deletedAt: new Date(),
    },
  });
}

export const updateWorkOrderStatusSchema = z.object({
  status: z.string(),
  id: z.number(),
});
export type UpdateWorkOrderStatusSchema = z.infer<
  typeof updateWorkOrderStatusSchema
>;

export async function updateWorkOrderStatus(
  ctx: TRPCContext,
  query: UpdateWorkOrderStatusSchema,
) {
  const { db } = ctx;
  db.workOrders.update({
    where: { id: query.id },
    data: {
      status: query.status,
    },
  });
}

/*
workOrderAnalytic: publicProcedure
      .input(workOrderAnalyticSchema)
      .query(async (props) => {
        return workOrderAnalytic(props.ctx, props.input);
      }),
*/

/*
getWorkorderChartFilter: publicProcedure
      .input(getWorkorderChartFilterSchema)
      .query(async (props) => {
        return getWorkorderChartFilter(props.ctx, props.input);
      }),
*/
export const getWorkorderChartFilterSchema = z.object({
  // date: z.string(),
});
export type GetWorkorderChartFilterSchema = z.infer<
  typeof getWorkorderChartFilterSchema
>;

export async function getWorkorderChartFilter(
  ctx: TRPCContext,
  query: GetWorkorderChartFilterSchema,
) {
  const { db } = ctx;
  const model = db.workOrders;

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setHours(0, 0, 0, 0);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 59); // 60 days including today

  const workOrders = await model.findMany({
    where: {
      createdAt: {
        gte: sixtyDaysAgo,
      },
      deletedAt: null,
    },
    select: {
      createdAt: true,
    },
  });

  const dailyCounts = new Map<string, number>();
  workOrders.forEach((wo) => {
    const dateKey = wo.createdAt?.toISOString().split("T")[0]; // YYYY-MM-DD
    dailyCounts.set(dateKey!, (dailyCounts.get(dateKey!) || 0) + 1);
  });

  const chartData: { date; total }[] = [];
  for (let i = 59; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const dateKey = date.toISOString().split("T")[0];
    const month = date
      .toLocaleString("default", { month: "short" })
      .toUpperCase();
    const day = date.getDate();

    chartData.push({
      date: i === 0 ? "TODAY" : `${month} ${day}`,
      total: dailyCounts.get(dateKey!) || 0,
    });
  }

  return chartData;
}
