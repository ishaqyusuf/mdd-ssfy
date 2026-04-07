import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { z } from "zod";
import {
  getUnitInvoicesSchema,
  whereUnitInvoices,
} from "./unit-invoices";

const unitInvoiceReportBaseSchema = getUnitInvoicesSchema.omit({
  cursor: true,
  size: true,
  sort: true,
});

export const getUnitInvoiceAgingReportSchema = unitInvoiceReportBaseSchema;

const unitInvoiceAgingSelect = {
  id: true,
  createdAt: true,
  lotBlock: true,
  modelName: true,
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
  _count: {
    select: {
      jobs: true,
      tasks: true,
    },
  },
  tasks: {
    where: {
      deletedAt: null,
    },
    select: {
      amountDue: true,
      amountPaid: true,
      taskUid: true,
    },
  },
} satisfies Prisma.HomesSelect;

function getAgingBucket(daysOpen: number) {
  if (daysOpen <= 30) return "Current";
  if (daysOpen <= 60) return "31-60 Days";
  if (daysOpen <= 90) return "61-90 Days";
  return "90+ Days";
}

export async function getUnitInvoiceAgingReport(
  ctx: TRPCContext,
  query: z.infer<typeof getUnitInvoiceAgingReportSchema>,
) {
  const rows = await ctx.db.homes.findMany({
    where: whereUnitInvoices(query),
    select: unitInvoiceAgingSelect,
    orderBy: [
      {
        createdAt: "asc",
      },
      {
        lot: "asc",
      },
      {
        block: "asc",
      },
    ],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const data = rows
    .map((item) => {
      const totals = item.tasks.reduce(
        (acc, task) => {
          const due = Number(task.amountDue || 0);
          const paid = Number(task.amountPaid || 0);

          acc.due += due;
          if (paid >= 0) {
            acc.paid += paid;
          } else {
            acc.chargeBack += paid;
          }
          return acc;
        },
        {
          due: 0,
          paid: 0,
          chargeBack: 0,
        },
      );

      const openBalance = totals.due - totals.paid;
      const openedOn = new Date(item.createdAt);
      openedOn.setHours(0, 0, 0, 0);
      const ageDays = Math.max(
        Math.floor((today.getTime() - openedOn.getTime()) / 86400000),
        0,
      );

      return {
        id: item.id,
        createdAt: item.createdAt,
        projectTitle: item.project?.title || "No project",
        builderName: item.project?.builder?.name || "No builder",
        lotBlock: item.lotBlock || "No lot/block",
        modelName: item.modelName || "No model",
        taskCount: item._count.tasks,
        jobCount: item._count.jobs,
        totalDue: totals.due,
        totalPaid: totals.paid,
        chargeBack: totals.chargeBack,
        openBalance,
        ageDays,
        agingBucket: getAgingBucket(ageDays),
      };
    })
    .filter((item) => item.openBalance > 0);

  const summary = data.reduce(
    (acc, item) => {
      acc.totalUnits += 1;
      acc.totalDue += item.totalDue;
      acc.totalPaid += item.totalPaid;
      acc.totalOpenBalance += item.openBalance;
      acc.totalChargeBack += item.chargeBack;
      acc[item.agingBucket] += item.openBalance;
      return acc;
    },
    {
      totalUnits: 0,
      totalDue: 0,
      totalPaid: 0,
      totalOpenBalance: 0,
      totalChargeBack: 0,
      Current: 0,
      "31-60 Days": 0,
      "61-90 Days": 0,
      "90+ Days": 0,
    },
  );

  return {
    data,
    summary: {
      totalUnits: summary.totalUnits,
      totalDue: summary.totalDue,
      totalPaid: summary.totalPaid,
      totalOpenBalance: summary.totalOpenBalance,
      totalChargeBack: summary.totalChargeBack,
      buckets: {
        current: summary.Current,
        days31To60: summary["31-60 Days"],
        days61To90: summary["61-90 Days"],
        days90Plus: summary["90+ Days"],
      },
    },
  };
}
