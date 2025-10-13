import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";
import {
  getFullSalesDataSchema,
  inboundQuerySchema,
  salesQueryParamsSchema,
} from "@api/schemas/sales";
import {
  __getQuotes,
  getQuotes,
  getSales,
  sales,
  startNewSales,
} from "@api/db/queries/sales";
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
import { generateRandomString, timeLog } from "@gnd/utils";
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
import {
  deleteSupplier,
  deleteSupplierSchema,
  getMultiLineComponents,
  getMultiLineComponentsSchema,
  getStepComponents,
  getStepComponentsSchema,
  getSuppliers,
  getSuppliersSchema,
  saveSupplier,
  saveSupplierSchema,
} from "@api/db/queries/sales-form";
import {
  getSalesAccountings,
  getSalesAccountingsSchema,
} from "@api/db/queries/sales-accounting";
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
  index: protectedProcedure
    .input(salesQueryParamsSchema)
    .query(async (props) => {
      const query = props.input;
      return getSales(props.ctx, transformSalesFilterQuery(query));
    }),
  sales: protectedProcedure
    .input(salesQueryParamsSchema)
    .query(async (props) => {
      return sales(props.ctx, transformSalesFilterQuery(props.input));
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
      const result = await getSales(props.ctx, {
        ...props.input,
        showing: "all sales",
      });
      const [sale] = result.data;
      return sale || null;
    }),
  getSalesResolutions: publicProcedure
    .input(getSalesResolutionsSchema)
    .query(async (props) => {
      const result = await getSalesResolutions(props.ctx, props.input);
      return result;
    }),
  getStepComponents: publicProcedure
    .input(getStepComponentsSchema)
    .query(async (props) => {
      return getStepComponents(props.ctx, props.input);
    }),
  getMultiLineComponents: publicProcedure
    .input(getMultiLineComponentsSchema)
    .query(async (props) => {
      return getMultiLineComponents(props.ctx, props.input);
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
  __getQuotes: publicProcedure
    .input(salesQueryParamsSchema)
    .query(async (props) => {
      return __getQuotes(props.ctx, transformSalesFilterQuery(props.input));
    }),
  quotes: publicProcedure.input(salesQueryParamsSchema).query(async (props) => {
    return getQuotes(props.ctx, transformSalesFilterQuery(props.input));
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
  getSalesAccountings: publicProcedure
    .input(getSalesAccountingsSchema)
    .query(async (props) => {
      return getSalesAccountings(props.ctx, props.input);
    }),
  getSuppliers: publicProcedure
    .input(getSuppliersSchema)
    .query(async (props) => {
      return getSuppliers(props.ctx, props.input);
    }),
  saveSupplier: publicProcedure
    .input(saveSupplierSchema)
    .mutation(async (props) => {
      return saveSupplier(props.ctx, props.input);
    }),
  deleteSupplier: publicProcedure
    .input(deleteSupplierSchema)
    .mutation(async (props) => {
      return deleteSupplier(props.ctx, props.input);
    }),
});
