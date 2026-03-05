import type { TRPCContext } from "@api/trpc/init";
import { Prisma } from "@gnd/db";
import type { SalesType } from "@sales/types";
import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";
import { getSales } from "./sales";
import { overallStatus } from "@api/utils/sales";

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
    {} as Record<string, number>,
  );

  const ret = interval.map((day) => ({
    date: format(day, "MMM d"),
    revenue: dailyRevenue[format(day, "yyyy-MM-dd")] || 0,
  }));
  return ret.filter((d, i) =>
    ret.filter((a, ai) => ai <= i).some((b) => b.revenue),
  );
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
  const thirtyDaysAgo = subDays(new Date(), 30);
  const salesWhere = getWhereClause(filter, "order");
  const products = await ctx.db.salesOrderItems.groupBy({
    by: ["description"],
    _sum: {
      qty: true,
    },
    where: {
      salesOrder: {
        ...salesWhere,
        createdAt: {
          gte: thirtyDaysAgo,
        },
        type: "order",
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
      createdAt: {
        gte: thirtyDaysAgo,
      },
      // type: "order",
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
  const thirtyDaysAgo = subDays(new Date(), 30);
  const salesWhere = getWhereClause(filter, "order");
  const reps = await ctx.db.salesOrders.groupBy({
    by: ["salesRepId"],
    _sum: {
      grandTotal: true,
    },
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
      // type: "order",
      ...salesWhere,
      deletedAt: null,
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

export async function getMobileSalesDashboardOverview(ctx: TRPCContext) {
  const [orders, recentOrders] = await Promise.all([
    ctx.db.salesOrders.findMany({
      where: {
        deletedAt: null,
        type: "order",
      },
      select: {
        id: true,
        stat: {
          where: {
            deletedAt: null,
          },
        },
        deliveries: {
          where: {
            deletedAt: null,
          },
          select: {
            status: true,
          },
        },
      },
    }),
    ctx.db.salesOrders.findMany({
      where: {
        deletedAt: null,
        type: "order",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        orderId: true,
        createdAt: true,
        grandTotal: true,
        amountDue: true,
        deliveryOption: true,
        customer: {
          select: {
            name: true,
            businessName: true,
          },
        },
      },
    }),
  ]);

  const production = {
    pending: 0,
    inProgress: 0,
    completed: 0,
    unknown: 0,
  };
  const delivery = {
    queue: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const order of orders) {
    const status = overallStatus(order.stat);
    const prodStatus = (status?.production?.status || "").toLowerCase();
    if (prodStatus === "pending") production.pending += 1;
    else if (prodStatus === "in progress") production.inProgress += 1;
    else if (prodStatus === "completed") production.completed += 1;
    else production.unknown += 1;

    for (const d of order.deliveries) {
      const value = (d.status || "").toLowerCase();
      if (value === "queue") delivery.queue += 1;
      else if (value === "in progress") delivery.inProgress += 1;
      else if (value === "completed") delivery.completed += 1;
      else if (value === "cancelled") delivery.cancelled += 1;
    }
  }

  return {
    orders: {
      total: orders.length,
    },
    production,
    delivery,
    recentSales: recentOrders.map((order) => ({
      id: order.id,
      orderId: order.orderId,
      customerName: order.customer?.businessName || order.customer?.name || "-",
      total: Number(order.grandTotal || 0),
      due: Number(order.amountDue || 0),
      paid: Number(order.grandTotal || 0) - Number(order.amountDue || 0),
      createdAt: order.createdAt?.toISOString() || null,
      deliveryOption: order.deliveryOption || null,
    })),
    updatedAt: new Date().toISOString(),
  };
}
