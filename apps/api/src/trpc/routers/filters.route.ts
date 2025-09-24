import {
  backlogFilters,
  getCommunityTemplateFilters,
  getCustomerFilters,
  getDispatchFilters,
  getInboundFilters,
  getInventoryFilters,
  getResolutionFilters,
  getSalesOrderFilters,
  getSalesProductionFilters,
  getSalesQuoteFilter,
  productReportFilters,
} from "@api/db/queries/filters";
import { createTRPCRouter, publicProcedure } from "../init";
import { z } from "zod";

export const filterRouters = createTRPCRouter({
  communityTemplateFilters: publicProcedure.query(async (props) =>
    getCommunityTemplateFilters(props.ctx)
  ),
  customer: publicProcedure.query(async (props) => {
    return getCustomerFilters(props.ctx);
  }),
  dispatch: publicProcedure.query(async (props) =>
    getDispatchFilters(props.ctx)
  ),
  inbound: publicProcedure.query(async (props) => {
    return getInboundFilters(props.ctx);
  }),
  inventory: publicProcedure.query(async (props) => {
    return getInventoryFilters(props.ctx);
  }),
  productReport: publicProcedure.query(async (props) => {
    return productReportFilters(props.ctx);
  }),
  salesResolutions: publicProcedure.query(async (props) => {
    const res = await getResolutionFilters(props.ctx);
    return res;
  }),
  backlog: publicProcedure.query(async (props) => {
    return backlogFilters(props.ctx);
  }),
  salesProductions: publicProcedure.query(async (props) =>
    getSalesProductionFilters(props.ctx)
  ),
  salesOrders: publicProcedure
    .input(
      z.object({
        salesManager: z.boolean().optional().nullable(),
      })
    )
    .query(async (props) =>
      getSalesOrderFilters(props.ctx, !!props.input.salesManager)
    ),
  salesQuotes: publicProcedure
    .input(
      z.object({
        salesManager: z.boolean().optional().nullable(),
      })
    )
    .query(async (props) =>
      getSalesQuoteFilter(props.ctx, props.input.salesManager)
    ),
});
