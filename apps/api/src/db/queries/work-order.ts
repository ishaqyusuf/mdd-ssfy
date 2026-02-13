import type { TRPCContext } from "@api/trpc/init";
import { slugify, slugModel } from "@gnd/utils";
import { z } from "zod";

export const workOrderFormSchema = z.object({
  id: z.number().optional().nullable(),
  techId: z.number().optional().nullable(),
  slug: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  lot: z.string(),
  block: z.string(),
  projectName: z.string().optional().nullable(),
  builderName: z.string().optional().nullable(),
  requestDate: z.date().optional().nullable(),
  supervisor: z.string().optional().nullable(),
  scheduleDate: z.date().optional().nullable(),
  scheduleTime: z.string().optional().nullable(),
  homeAddress: z.string().optional().nullable(),
  homeOwner: z.string().optional().nullable(),
  homePhone: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  assignedAt: z.string().optional().nullable(),
  meta: z.object({
    lotBlock: z.string(),
  }),
});
export type WorkOrderForm = z.infer<typeof workOrderFormSchema>;

export async function getWorkOrderForm(ctx: TRPCContext, id) {
  const wo = await ctx.db.workOrders.findUniqueOrThrow({
    where: {
      id,
    },
  });
  return wo;
}

export async function saveWorkOrderForm(ctx: TRPCContext, data: WorkOrderForm) {
  if (!data.slug)
    data.slug = await slugModel(
      [data.projectName, data.lot, data.block],
      ctx.db.workOrders,
    );
  const { id, techId, ...updateData } = data;
  if (id)
    await ctx.db.workOrders.update({
      where: {
        id,
      },
      data: {
        ...(updateData as any),
      },
    });
  else
    await ctx.db.workOrders.create({
      data: { ...(updateData as any) },
    });
}
export const workOrderAnalyticSchema = z.object({
  type: z.enum(["total", "pending", "completed", "avg"]),
});
export type WorkOrderAnalyticSchema = z.infer<typeof workOrderAnalyticSchema>;

function calculatePercentageChange(current: number, previous: number): string {
  if (previous === 0) {
    if (current > 0) return "+100%";
    return "0%";
  }
  const change = ((current - previous) / previous) * 100;
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
}

export async function workOrderAnalytic(
  ctx: TRPCContext,
  query: WorkOrderAnalyticSchema,
): Promise<{
  title: string;
  value: string;
  change: string;
}> {
  const { db } = ctx;
  const model = db.workOrders;

  const today = new Date();
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
  const sixtyDaysAgo = new Date(new Date().setDate(today.getDate() - 60));

  let title = "";
  let value = "";
  let change = "";

  switch (query.type) {
    case "total": {
      title = "Total Work Orders";
      const currentPeriodCount = await model.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          deletedAt: null,
        },
      });
      const previousPeriodCount = await model.count({
        where: {
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          deletedAt: null,
        },
      });
      value = currentPeriodCount.toLocaleString();
      change =
        calculatePercentageChange(currentPeriodCount, previousPeriodCount) +
        " from last month";
      break;
    }
    case "pending": {
      title = "Pending";
      const currentPendingCount = await model.count({
        where: {
          status: "Pending",
          deletedAt: null,
        },
      });
      // Note: Change calculation for pending items is non-trivial without historical snapshots.
      // This calculates the change in *new* pending items month-over-month.
      const currentPeriodNewPending = await model.count({
        where: {
          status: "Pending",
          createdAt: { gte: thirtyDaysAgo },
          deletedAt: null,
        },
      });
      const previousPeriodNewPending = await model.count({
        where: {
          status: "Pending",
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          deletedAt: null,
        },
      });
      value = currentPendingCount.toLocaleString();
      change =
        calculatePercentageChange(
          currentPeriodNewPending,
          previousPeriodNewPending,
        ) + " from last month";
      break;
    }
    case "completed": {
      title = "Completed";
      // This assumes a `completedAt` field is set when status changes to 'Completed'.
      const currentPeriodCompleted = await model.count({
        where: {
          status: "Completed",
          updatedAt: { gte: thirtyDaysAgo }, // Using updatedAt as a proxy for completedAt
          deletedAt: null,
        },
      });
      const previousPeriodCompleted = await model.count({
        where: {
          status: "Completed",
          updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          deletedAt: null,
        },
      });
      value = currentPeriodCompleted.toLocaleString();
      change =
        calculatePercentageChange(
          currentPeriodCompleted,
          previousPeriodCompleted,
        ) + " from last month";
      break;
    }
    case "avg": {
      title = "Avg. Completion";
      // This assumes a `completedAt` field exists. Using `updatedAt` as a proxy.
      const currentCompleted = await model.findMany({
        where: {
          status: "Completed",
          updatedAt: { gte: thirtyDaysAgo },
          deletedAt: null,
        },
        select: { createdAt: true, updatedAt: true },
      });

      let currentAvg = 0;
      if (currentCompleted.length > 0) {
        const totalDiff = currentCompleted.reduce((acc, wo) => {
          return acc + (wo.updatedAt!.getTime() - wo.createdAt!.getTime());
        }, 0);
        currentAvg = totalDiff / currentCompleted.length;
      }

      const previousCompleted = await model.findMany({
        where: {
          status: "Completed",
          updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          deletedAt: null,
        },
        select: { createdAt: true, updatedAt: true },
      });

      let previousAvg = 0;
      if (previousCompleted.length > 0) {
        const totalDiff = previousCompleted.reduce((acc, wo) => {
          return acc + (wo.updatedAt!.getTime() - wo.createdAt!.getTime());
        }, 0);
        previousAvg = totalDiff / previousCompleted.length;
      }

      const avgDays = (currentAvg / (1000 * 60 * 60 * 24)).toFixed(1);
      value = `${avgDays} days`;
      // Inverting change for time: lower is better.
      change =
        calculatePercentageChange(previousAvg, currentAvg) + " from last month";
      break;
    }
  }

  return { title, value, change };
}
