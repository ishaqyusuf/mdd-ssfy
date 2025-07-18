import { createTRPCRouter, publicProcedure } from "../init";
import { inboundQuerySchema, salesQueryParamsSchema } from "@api/schemas/sales";
import { getSales } from "@api/db/queries/sales";
import { getInbounds, getInboundSummary } from "@api/db/queries/inbound";

export const salesRouter = createTRPCRouter({
  index: publicProcedure.input(salesQueryParamsSchema).query(async (props) => {
    return getSales(props.ctx, props.input);
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
});
