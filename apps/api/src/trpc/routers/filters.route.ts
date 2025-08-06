import {
  getCommunityTemplateFilters,
  getDispatchFilters,
  getInboundFilters,
  getSalesOrderFilters,
  getSalesQuoteFilter,
} from "@api/db/queries/filters";
import { createTRPCRouter, publicProcedure } from "../init";

export const filterRouters = createTRPCRouter({
  communityTemplateFilters: publicProcedure.query(async (props) =>
    getCommunityTemplateFilters(props.ctx)
  ),
  dispatch: publicProcedure.query(async (props) =>
    getDispatchFilters(props.ctx)
  ),
  inbound: publicProcedure.query(async (props) => {
    return getInboundFilters(props.ctx);
  }),
  salesOrders: publicProcedure.query(async (props) =>
    getSalesOrderFilters(props.ctx)
  ),
  salesQuotes: publicProcedure.query(async (props) =>
    getSalesQuoteFilter(props.ctx)
  ),
});
