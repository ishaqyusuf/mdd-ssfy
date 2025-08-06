import { createTRPCRouter, publicProcedure } from "../init";
import {
  getFullSalesDataSchema,
  inboundQuerySchema,
  salesQueryParamsSchema,
} from "@api/schemas/sales";
import { getQuotes, getSales, startNewSales } from "@api/db/queries/sales";
import { getInbounds, getInboundSummary } from "@api/db/queries/inbound";
import { startNewSalesSchema } from "@api/schemas/sales";
import { transformSalesFilterQuery } from "@api/utils/sales";
import { getSaleInformation } from "@gnd/sales/get-sale-information";
import {
  getSalesResolutions,
  getSalesResolutionsSchema,
} from "@api/db/queries/sales-resolution";
export const salesRouter = createTRPCRouter({
  index: publicProcedure.input(salesQueryParamsSchema).query(async (props) => {
    const query = props.input;

    return getSales(props.ctx, transformSalesFilterQuery(query));
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
  getSalesResolutions: publicProcedure
    .input(getSalesResolutionsSchema)
    .query(async (props) => {
      const result = await getSalesResolutions(props.ctx, props.input);
      return result;
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
  productionOverview: publicProcedure
    .input(getFullSalesDataSchema)
    .query(async (props) => {
      // const resp = await getSalesLifeCycle(props.ctx, props.input);
      // return resp;
      return await getSaleInformation(props.ctx.db, props.input);
    }),
  quotes: publicProcedure.input(salesQueryParamsSchema).query(async (props) => {
    return getQuotes(props.ctx, props.input);
  }),
  startNewSales: publicProcedure
    .input(startNewSalesSchema)
    .mutation(async (props) => {
      return startNewSales(props.ctx, props.input.customerId);
    }),
});
