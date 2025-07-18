import {
  getDispatchFilters,
  getInboundFilters,
  getSalesOrderFilters,
} from "@api/db/queries/filters";
import { createTRPCRouter, publicProcedure } from "../init";

export const filterRouters = createTRPCRouter({
  dispatch: publicProcedure.query(async (props) =>
    getDispatchFilters(props.ctx),
  ),
  inbound: publicProcedure.query(async (props) => {
    return getInboundFilters(props.ctx);
  }),
  salesOrders: publicProcedure.query(async (props) =>
    getSalesOrderFilters(props.ctx),
  ),
});
