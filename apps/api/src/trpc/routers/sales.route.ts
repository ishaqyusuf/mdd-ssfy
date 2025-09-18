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
import { resolvePayment, resolvePaymentSchema } from "@api/db/queries/wallet";
import {
  getInvoicePrintData,
  printInvoiceSchema,
  salesProductionQueryParamsSchema,
} from "@sales/exports";
import { salesPayWithWallet, salesPayWithWalletSchema } from "@sales/wallet";
import { getSalesProductions } from "@sales/sales-production";
import { z } from "zod";
import { consoleLog, generateRandomString, timeLog } from "@gnd/utils";
import { getCustomers } from "@api/db/queries/customer";
import { getCustomersSchema } from "@api/schemas/customer";
import {
  getProductReport,
  productReportSchema,
} from "@api/db/queries/product-report";
import { getSalesHx, getSalesHxSchema } from "@api/db/queries/sales-hx";
import {
  accountingIndex,
  accountingIndexSchema,
} from "@api/db/queries/accounting";
export const salesRouter = createTRPCRouter({
  createStep: publicProcedure
    .input(
      z.object({
        title: z.string(),
      })
    )
    .mutation(async (props) => {
      const db = props.ctx.db;
      const title = props.input.title;
      return await db.dykeSteps.create({
        data: {
          uid: generateRandomString(4),
          title,
          meta: {},
        },
      });
      // return createStep(props.ctx, props.input);
    }),
  index: publicProcedure.input(salesQueryParamsSchema).query(async (props) => {
    const query = props.input;
    return getSales(props.ctx, transformSalesFilterQuery(query));
  }),
  productions: publicProcedure
    .input(salesProductionQueryParamsSchema)
    .query(async (props) => {
      return getSalesProductions(props.ctx.db, props.input);
    }),
  productionTasks: publicProcedure
    .input(salesProductionQueryParamsSchema)
    .query(async (props) => {
      const input = { ...props.input };
      input.workerId = props.ctx.userId;
      return getSalesProductions(props.ctx.db, input);
    }),
  getSalesHx: publicProcedure.input(getSalesHxSchema).query(async (props) => {
    return getSalesHx(props.ctx, props.input);
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
  customersIndex: publicProcedure
    .input(getCustomersSchema)
    .query(async (props) => {
      return getCustomers(props.ctx, props.input);
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
  salesPayWithWallet: publicProcedure
    .input(salesPayWithWalletSchema)
    .mutation(async (props) => {
      return salesPayWithWallet(props.ctx.db, props.input);
    }),
  startNewSales: publicProcedure
    .input(startNewSalesSchema)
    .mutation(async (props) => {
      return startNewSales(props.ctx, props.input.customerId);
    }),
  resolvePayment: publicProcedure
    .input(resolvePaymentSchema)
    .mutation(async (props) => {
      return resolvePayment(props.ctx, props.input);
    }),
  printInvoice: publicProcedure
    .input(printInvoiceSchema)
    .query(async (props) => {
      return getInvoicePrintData(props.ctx.db, props.input);
    }),

  // sales statistics
  getProductReport: publicProcedure
    .input(productReportSchema)
    .query(async (props) => {
      return getProductReport(props.ctx, props.input);
    }),

  accountingIndex: publicProcedure
    .input(accountingIndexSchema)
    .query(async (props) => {
      const result = await accountingIndex(props.ctx, props.input);
      return result;
    }),
});
