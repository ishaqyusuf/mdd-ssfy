import { createTRPCRouter, publicProcedure } from "../init";

type PageTab = {
  title: string;
  count: number;
  url?: string;
  params?: Record<string, string>;
};

export const pageTabsRouter = createTRPCRouter({
  salesBook: publicProcedure.query(async ({ ctx }) => {
    const [sales, dispatchCount] = await Promise.all([
      ctx.db.salesOrders.findMany({
        select: {
          type: true,
          assignments: {
            select: {
              id: true,
            },
          },
        },
      }),
      ctx.db.orderDelivery.count(),
    ]);

    const tabs: PageTab[] = [
      {
        title: "Orders",
        url: "/sales-book/orders",
        count: sales.filter((sale) => sale.type === "order").length,
      },
      {
        title: "Quotes",
        url: "/sales-book/quotes",
        count: sales.filter((sale) => sale.type === "quote").length,
      },
      {
        title: "Productions",
        url: "/sales-book/productions",
        count: sales.filter(
          (sale) => sale.type === "order" && sale.assignments.length > 0,
        ).length,
      },
      {
        title: "Dispatch",
        url: "/sales-book/dispatch",
        count: dispatchCount,
      },
    ];

    return tabs;
  }),

  salesDashboard: publicProcedure.query(async ({ ctx }) => {
    const sales = await ctx.db.salesOrders.findMany({
      select: {
        type: true,
        deliveryOption: true,
        status: true,
      },
    });

    const tabs: PageTab[] = [
      {
        title: "Orders",
        url: "/sales/dashboard/orders",
        count: sales.filter((sale) => sale.type === "order").length,
      },
      {
        title: "Quotes",
        url: "/sales/dashboard/quotes",
        count: sales.filter((sale) => sale.type === "quote").length,
      },
      {
        title: "Delivery",
        url: "/sales/dashboard/delivery",
        count: sales.filter(
          (sale) =>
            sale.type === "order" && sale.deliveryOption === "delivery",
        ).length,
      },
      {
        title: "Pickup",
        url: "/sales/dashboard/pickup",
        count: sales.filter(
          (sale) => sale.type === "order" && sale.deliveryOption === "pickup",
        ).length,
      },
      {
        title: "Pending Evaluation",
        url: "/sales/dashboard/pending-evaluation",
        count: sales.filter((sale) => sale.status === "Evaluating").length,
      },
    ];

    return tabs;
  }),

  dealers: publicProcedure.query(async ({ ctx }) => {
    const records = await ctx.db.dealerAuth.findMany({
      select: {
        status: true,
      },
    });

    const byStatus = (
      status: "Approved" | "Pending Approval" | "Rejected" | "Restricted",
    ) =>
      records.filter((record) => {
        if (!record.status && status === "Pending Approval") {
          return true;
        }
        return record.status === status;
      }).length;

    const tabs: PageTab[] = [
      {
        title: "Dealers",
        count: byStatus("Approved"),
      },
      {
        title: "Pending Approval",
        count: byStatus("Pending Approval"),
        params: {
          status: "Pending Approval",
        },
      },
      {
        title: "Rejected",
        count: byStatus("Rejected"),
        params: {
          status: "Rejected",
        },
      },
      {
        title: "Restricted",
        count: byStatus("Restricted"),
        params: {
          status: "Restricted",
        },
      },
    ];

    return tabs;
  }),
});
