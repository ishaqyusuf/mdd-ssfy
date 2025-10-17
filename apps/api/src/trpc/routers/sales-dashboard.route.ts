import { z } from "zod";
import {
  getKpis,
  getRecentSales,
  getRevenueOverTime,
  getSalesRepLeaderboard,
  getTopProducts,
} from "../../db/queries/sales-dashboard";
import { salesDashboardFilterSchema } from "@api/schemas/sales";
import { createTRPCRouter, publicProcedure } from "../init";

export const salesDashboardRouter = createTRPCRouter({
  getKpis: publicProcedure
    .input(salesDashboardFilterSchema)
    .query(async ({ ctx, input }) => {
      return getKpis(ctx, input);
    }),

  getRevenueOverTime: publicProcedure
    .input(salesDashboardFilterSchema)
    .query(async ({ ctx, input }) => {
      return getRevenueOverTime(ctx, input);
    }),

  getRecentSales: publicProcedure
    // .input(salesDashboardFilterSchema)
    .query(async ({ ctx, input }) => {
      return getRecentSales(ctx);
    }),

  getTopProducts: publicProcedure
    .input(salesDashboardFilterSchema)
    .query(async ({ ctx, input }) => {
      return getTopProducts(ctx, input);
    }),

  getSalesRepLeaderboard: publicProcedure
    .input(salesDashboardFilterSchema)
    .query(async ({ ctx, input }) => {
      return getSalesRepLeaderboard(ctx, input);
    }),
});
