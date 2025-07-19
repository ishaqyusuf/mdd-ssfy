import type { TRPCContext } from "@api/trpc/init";
import { Prisma } from "@prisma/client";
import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";

type Filter = {
  from?: string;
  to?: string;
};

const getWhereClause = (filter: Filter, type?: "invoice" | "quote") => {
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
  const salesWhere = getWhereClause(filter, "invoice");
  const quotesWhere = getWhereClause(filter, "quote");

  const [totalRevenue, newSales, newQuotes, activeProductionOrders] =
    await Promise.all([
      ctx.db.salesOrders.aggregate({
        _sum: { grandTotal: true },
        where: salesWhere,
      }),
      ctx.db.salesOrders.count({ where: salesWhere }),
      ctx.db.salesOrders.count({ where: quotesWhere }),
      ctx.db.salesOrders.count({
        where: {
          type: "invoice",
          prodStatus: {
            in: ["pending", "in_progress", "started"],
          },
        },
      }),
    ]);

  return {
    totalRevenue: totalRevenue._sum.grandTotal ?? 0,
    newSales: newSales ?? 0,
    newQuotes: newQuotes ?? 0,
    activeProductionOrders: activeProductionOrders ?? 0,
  };
}

export async function getRevenueOverTime(ctx: TRPCContext, filter: Filter) {
  const where = getWhereClause(filter, "invoice");
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
    {} as Record<string, number>,
  );

  return interval.map((day) => ({
    date: format(day, "MMM d"),
    revenue: dailyRevenue[format(day, "yyyy-MM-dd")] || 0,
  }));
}

export async function getRecentSales(ctx: TRPCContext) {
  const sales = await ctx.db.salesOrders.findMany({
    where: { type: "invoice" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      orderId: true,
      grandTotal: true,
      customer: {
        select: {
          name: true,
        },
      },
    },
  });

  return sales.map((s) => ({
    id: s.id,
    orderId: s.orderId,
    customerName: s.customer?.name ?? "N/A",
    amount: s.grandTotal ?? 0,
  }));
}

export async function getTopProducts(ctx: TRPCContext) {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const products = await ctx.db.salesOrderItems.groupBy({
    by: ["description"],
    _sum: {
      qty: true,
    },
    where: {
      salesOrder: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
        type: "invoice",
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

  return products.map((p) => ({
    name: p.description!,
    count: p._sum.qty ?? 0,
  }));
}

export async function getSalesRepLeaderboard(ctx: TRPCContext) {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const reps = await ctx.db.salesOrders.groupBy({
    by: ["salesRepId"],
    _sum: {
      grandTotal: true,
    },
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
      type: "invoice",
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
    {} as Record<number, string>,
  );

  return reps.map((rep) => ({
    id: rep.salesRepId!,
    name: userMap[rep.salesRepId!],
    totalSales: rep._sum.grandTotal ?? 0,
  }));
}
