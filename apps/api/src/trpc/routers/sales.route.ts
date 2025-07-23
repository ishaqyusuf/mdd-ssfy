import { createTRPCRouter, publicProcedure } from "../init";
import {
  getFullSalesDataSchema,
  inboundQuerySchema,
  salesQueryParamsSchema,
} from "@api/schemas/sales";
import {
  getQuotes,
  getSales,
  getSalesLifeCycle,
  startNewSales,
} from "@api/db/queries/sales";
import { getInbounds, getInboundSummary } from "@api/db/queries/inbound";
import { startNewSalesSchema } from "@api/schemas/sales";
import { transformSalesFilterQuery } from "@api/utils/sales";
import type { RenturnTypeAsync } from "@api/type";

export const salesRouter = createTRPCRouter({
  index: publicProcedure.input(salesQueryParamsSchema).query(async (props) => {
    return getSales(props.ctx, transformSalesFilterQuery(props.input));
  }),
  getSaleOverview: publicProcedure
    .input(salesQueryParamsSchema)
    .query(async (props) => {
      const result = await getSales(
        props.ctx,
        transformSalesFilterQuery(props.input)
      );
      const [sale] = result.data;
      return sale;
    }),
  quotes: publicProcedure.input(salesQueryParamsSchema).query(async (props) => {
    return getQuotes(props.ctx, props.input);
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
  startNewSales: publicProcedure
    .input(startNewSalesSchema)
    .mutation(async (props) => {
      return startNewSales(props.ctx, props.input.customerId);
    }),
  productionOverview: publicProcedure
    .input(getFullSalesDataSchema)
    .query(async (props) => {
      const resp = await getSalesLifeCycle(props.ctx, props.input);
      // (property) ItemControlData.qty: Qty
      resp?.items?.[0]?.qty.qty;
      return resp as RenturnTypeAsync<typeof getSalesLifeCycle>;
    }),
});
