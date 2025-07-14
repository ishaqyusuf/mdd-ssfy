import { createTRPCRouter, publicProcedure } from "../init";
import { inboundQuerySchema, salesQueryParamsSchema } from "@api/schemas/sales";

import {
  getInboundFilters,
  getInbounds,
  getInboundSummary,
} from "@api/db/queries/inbound";
import { dispatchQueryParamsSchema } from "@api/schemas/dispatch";
import { getDispatches } from "@api/db/queries/dispatch";

export const dispatchRouters = createTRPCRouter({
  index: publicProcedure
    .input(dispatchQueryParamsSchema)
    .query(async (props) => {
      return getDispatches(props.ctx, props.input);
    }),
  inboundIndex: publicProcedure
    .input(inboundQuerySchema)
    .query(async (props) => {
      return getInbounds(props.ctx, props.input);
    }),
  inboundSummary: publicProcedure
    .input(inboundQuerySchema)
    .query(async (props) => {
      return getInboundSummary(props.ctx, props.input);
    }),
  inboundFilterData: publicProcedure.query(async (props) => {
    return getInboundFilters(props.ctx);
  }),
});
