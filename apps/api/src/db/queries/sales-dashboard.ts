import type { TRPCContext } from "@api/trpc/init";
import { Prisma } from "@prisma/client";
import type { SalesType } from "@sales/types";
import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";
import { getSales } from "./sales";

type Filter = {
  from?: string;
  to?: string;
};

const getWhereClause = (filter: Filter, type?: SalesType) => {
  const where: Prisma.SalesOrdersWhereInput = {};
  if (type) {
    where.type = type;
  }
  if (filter.from && filter.to) {
    where.createdAt = {
      gte: parseISO(filter.from),
      lte: parseISO(filter.to),
    };
  }
  return where;
};

export async function getKpis(ctx: TRPCContext, filter: Filter) {
  const salesWhere = getWhereClause(filter, "order");
  const quotesWhere = getWhereClause(filter, "quote");

  const [totalRevenue, totalDue, newSales, newQuotes, activeProductionOrders] =
    await Promise.all([
      ctx.db.salesOrders.aggregate({
        _sum: { grandTotal: true },
        where: salesWhere,
      }),
      ctx.db.salesOrders.aggregate({
        _sum: { amountDue: true },
        where: salesWhere,
      }),
      ctx.db.salesOrders.count({ where: salesWhere }),
      ctx.db.salesOrders.count({ where: quotesWhere }),
      ctx.db.salesOrders.count({
        where: {
          type: "order",
          prodStatus: {
            in: ["pending", "in_progress", "started"],
          },
        },
      }),
    ]);

  return {
    totalRevenue: totalRevenue._sum.grandTotal ?? 0,
    totalDue: totalDue._sum.amountDue ?? 0,
    newSales: newSales ?? 0,
    newQuotes: newQuotes ?? 0,
    activeProductionOrders: activeProductionOrders ?? 0,
  };
}

export async function getRevenueOverTime(ctx: TRPCContext, filter: Filter) {
  const where = getWhereClause(filter, "order");
  const sales = await ctx.db.salesOrders.findMany({
    where,
    select: {
      createdAt: true,
      grandTotal: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const interval = eachDayOfInterval({
    start: filter.from ? parseISO(filter.from) : subDays(new Date(), 30),
    end: filter.to ? parseISO(filter.to) : new Date(),
  });

  const dailyRevenue = sales.reduce(
    (acc, sale) => {
      const date = format(sale.createdAt!, "yyyy-MM-dd");
      acc[date] = (acc[date] || 0) + (sale.grandTotal ?? 0);
      return acc;
    },
    {} as Record<string, number>
  );

  return interval.map((day) => ({
    date: format(day, "MMM d"),
    revenue: dailyRevenue[format(day, "yyyy-MM-dd")] || 0,
  }));
}

export async function getRecentSales(ctx: TRPCContext) {
  const recent = await getSales(ctx, {
    salesType: "order",
    size: 5,
  });
  return recent?.data;
  // const sales = await ctx.db.salesOrders.findMany({
  //   where: { type: "order" },
  //   orderBy: { createdAt: "desc" },
  //   take: 5,
  //   select: {
  //     id: true,
  //     orderId: true,
  //     grandTotal: true,
  //     customer: {
  //       select: {
  //         name: true,
  //       },
  //     },
  //   },
  // });

  // return sales.map((s) => ({
  //   id: s.id,
  //   orderId: s.orderId,
  //   customerName: s.customer?.name ?? "N/A",
  //   amount: s.grandTotal ?? 0,
  // }));
}

export async function getTopProducts(ctx: TRPCContext, filter: Filter) {
  // const thirtyDaysAgo = subDays(new Date(), 30);
  const salesWhere = getWhereClause(filter, "order");
  const products = await ctx.db.salesOrderItems.groupBy({
    by: ["description"],
    _sum: {
      qty: true,
    },
    where: {
      salesOrder: {
        ...salesWhere,
        // createdAt: {
        //   gte: thirtyDaysAgo,
        // },
        // type: "order",
      },
      description: {
        not: null,
      },
    },
    orderBy: {
      _sum: {
        qty: "desc",
      },
    },
    take: 5,
  });
  const doors = await ctx.db.dykeSalesDoors.groupBy({
    by: ["stepProductId"],
    _sum: {
      totalQty: true,
    },
    where: {
      salesOrderItem: {
        salesOrder: {
          ...salesWhere,
        },
      },
      //   createdAt: {
      //     gte: thirtyDaysAgo,
      //   },
      //   type: "order",
      // },
      // description: {
      //   not: null,
      // },
    },
    orderBy: {
      _sum: {
        totalQty: "desc",
      },
    },
    take: 5,
  });
  const steps = await ctx.db.dykeStepProducts.findMany({
    where: {
      id: {
        in: doors.map((a) => a.stepProductId!),
      },
    },
    select: {
      name: true,
      id: true,
      door: {
        select: {
          title: true,
        },
      },
    },
  });
  return doors.map((d) => {
    const step = steps.find((s) => s.id == d.stepProductId);
    const name = step?.name || step?.door?.title;
    return {
      name,
      count: d._sum.totalQty ?? 0,
    };
  });
  // return products.map((p) => ({
  //   name: p.description!,
  //   count: p._sum.qty ?? 0,
  // }));
}

export async function getSalesRepLeaderboard(ctx: TRPCContext, filter: Filter) {
  // const thirtyDaysAgo = subDays(new Date(), 30);
  const salesWhere = getWhereClause(filter, "order");
  const reps = await ctx.db.salesOrders.groupBy({
    by: ["salesRepId"],
    _sum: {
      grandTotal: true,
    },
    where: {
      // createdAt: {
      //   gte: thirtyDaysAgo,
      // },
      // type: "order",
      ...salesWhere,
      salesRepId: {
        not: null,
      },
    },
    orderBy: {
      _sum: {
        grandTotal: "desc",
      },
    },
    take: 5,
  });

  const userIds = reps.map((r) => r.salesRepId!);
  const users = await ctx.db.users.findMany({
    where: {
      id: { in: userIds },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const userMap = users.reduce(
    (acc, user) => {
      acc[user.id] = user.name ?? "Unknown";
      return acc;
    },
    {} as Record<number, string>
  );

  return reps.map((rep) => ({
    id: rep.salesRepId!,
    name: userMap[rep.salesRepId!],
    totalSales: rep._sum.grandTotal ?? 0,
  }));
}
