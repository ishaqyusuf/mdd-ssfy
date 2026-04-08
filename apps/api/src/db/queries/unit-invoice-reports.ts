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
export const getUnitInvoiceTaskDetailReportSchema = unitInvoiceReportBaseSchema;

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

const unitInvoiceTaskDetailSelect = {
  id: true,
  taskName: true,
  amountDue: true,
  amountPaid: true,
  taxCost: true,
  checkNo: true,
  checkDate: true,
  createdAt: true,
  home: {
    select: {
      id: true,
      lot: true,
      block: true,
      lotBlock: true,
      modelName: true,
      project: {
        select: {
          id: true,
          title: true,
          builder: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.HomeTasksSelect;

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

export async function getUnitInvoiceTaskDetailReport(
  ctx: TRPCContext,
  query: z.infer<typeof getUnitInvoiceTaskDetailReportSchema>,
) {
  const homeWhere = whereUnitInvoices(query);

  const rows = await ctx.db.homeTasks.findMany({
    where: {
      deletedAt: null,
      home: {
        is: homeWhere
          ? {
              AND: [
                {
                  deletedAt: null,
                },
                homeWhere,
              ],
            }
          : {
              deletedAt: null,
            },
      },
    },
    select: unitInvoiceTaskDetailSelect,
    orderBy: [
      {
        home: {
          project: {
            title: "asc",
          },
        },
      },
      {
        home: {
          lot: "asc",
        },
      },
      {
        home: {
          block: "asc",
        },
      },
      {
        createdAt: "asc",
      },
      {
        taskName: "asc",
      },
    ],
  });

  const groupedProjectMap = new Map<
    string,
    {
      projectTitle: string;
      builderName: string;
      units: Array<{
        unitId: number;
        lot: string;
        block: string;
        lotBlock: string;
        modelName: string;
        taskCount: number;
        totalCost: number;
        totalTax: number;
        totalDue: number;
        totalPaid: number;
        totalOpenBalance: number;
        tasks: Array<{
          id: number;
          taskName: string;
          taskDate: Date | null;
          cost: number;
          tax: number;
          due: number;
          paid: number;
          openBalance: number;
          checkNo: string | null;
          checkDate: Date | null;
        }>;
      }>;
      summary: {
        unitCount: number;
        taskCount: number;
        totalCost: number;
        totalTax: number;
        totalDue: number;
        totalPaid: number;
        totalOpenBalance: number;
      };
    }
  >();

  const overallSummary = {
    totalProjects: 0,
    totalUnits: 0,
    totalTasks: 0,
    totalCost: 0,
    totalTax: 0,
    totalDue: 0,
    totalPaid: 0,
    totalOpenBalance: 0,
  };

  for (const row of rows) {
    const unit = row.home;
    const projectTitle = unit?.project?.title || "No project";
    const builderName = unit?.project?.builder?.name || "No builder";
    const projectKey = String(unit?.project?.id || `${projectTitle}::${builderName}`);
    const tax = Number(row.taxCost || 0);
    const due = Number(row.amountDue || 0);
    const paid = Number(row.amountPaid || 0);
    const cost = due - tax;
    const openBalance = due - paid;

    let projectGroup = groupedProjectMap.get(projectKey);
    if (!projectGroup) {
      projectGroup = {
        projectTitle,
        builderName,
        units: [],
        summary: {
          unitCount: 0,
          taskCount: 0,
          totalCost: 0,
          totalTax: 0,
          totalDue: 0,
          totalPaid: 0,
          totalOpenBalance: 0,
        },
      };
      groupedProjectMap.set(projectKey, projectGroup);
    }

    let unitGroup = projectGroup.units.find((item) => item.unitId === unit?.id);
    if (!unitGroup) {
      unitGroup = {
        unitId: unit?.id || row.id * -1,
        lot: unit?.lot || "",
        block: unit?.block || "",
        lotBlock: unit?.lotBlock || "No lot/block",
        modelName: unit?.modelName || "No model",
        taskCount: 0,
        totalCost: 0,
        totalTax: 0,
        totalDue: 0,
        totalPaid: 0,
        totalOpenBalance: 0,
        tasks: [],
      };
      projectGroup.units.push(unitGroup);
      projectGroup.summary.unitCount += 1;
      overallSummary.totalUnits += 1;
    }

    unitGroup.tasks.push({
      id: row.id,
      taskName: row.taskName || "Untitled task",
      taskDate: row.createdAt || null,
      cost,
      tax,
      due,
      paid,
      openBalance,
      checkNo: row.checkNo || null,
      checkDate: row.checkDate || null,
    });
    unitGroup.taskCount += 1;
    unitGroup.totalCost += cost;
    unitGroup.totalTax += tax;
    unitGroup.totalDue += due;
    unitGroup.totalPaid += paid;
    unitGroup.totalOpenBalance += openBalance;

    projectGroup.summary.taskCount += 1;
    projectGroup.summary.totalCost += cost;
    projectGroup.summary.totalTax += tax;
    projectGroup.summary.totalDue += due;
    projectGroup.summary.totalPaid += paid;
    projectGroup.summary.totalOpenBalance += openBalance;

    overallSummary.totalTasks += 1;
    overallSummary.totalCost += cost;
    overallSummary.totalTax += tax;
    overallSummary.totalDue += due;
    overallSummary.totalPaid += paid;
    overallSummary.totalOpenBalance += openBalance;
  }

  const data = Array.from(groupedProjectMap.values())
    .sort((a, b) => a.projectTitle.localeCompare(b.projectTitle))
    .map((project) => ({
      ...project,
      units: [...project.units].sort((a, b) => {
        const lotCompare = String(a.lot || "").localeCompare(
          String(b.lot || ""),
          undefined,
          { numeric: true, sensitivity: "base" },
        );
        if (lotCompare !== 0) return lotCompare;
        return String(a.block || "").localeCompare(String(b.block || ""), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }),
    }));

  overallSummary.totalProjects = data.length;

  return {
    data,
    summary: overallSummary,
  };
}
