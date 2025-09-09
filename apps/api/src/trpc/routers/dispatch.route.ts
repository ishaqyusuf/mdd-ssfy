import { createTRPCRouter, publicProcedure } from "../init";
import {
  dispatchQueryParamsSchema,
  salesDispatchOverviewSchema,
  updateSalesDeliveryOptionSchema,
} from "@api/schemas/sales";
import {
  getDispatches,
  getDispatchOverview,
  getSalesDeliveryInfo,
  updateSalesDeliveryOption,
} from "@api/db/queries/dispatch";
import { z } from "zod";
import {
  cancelDispatchTask,
  deletePackingItem,
  deletePackingSchema,
  getSalesDispatchOverview,
  startDispatchTask,
  submitDispatchTask,
  updateSalesControlSchema,
} from "@sales/exports";

export const dispatchRouters = createTRPCRouter({
  index: publicProcedure
    .input(dispatchQueryParamsSchema)
    .query(async (props) => {
      return getDispatches(props.ctx, props.input);
    }),
  assignedDispatch: publicProcedure
    .input(dispatchQueryParamsSchema)
    .query(async (props) => {
      props.input.driversId = [props.ctx?.userId!];
      return getDispatches(props.ctx, props.input);
    }),
  deletePackingItem: publicProcedure
    .input(deletePackingSchema)
    .mutation(async (props) => {
      return deletePackingItem(props.ctx.db, props.input);
    }),
  cancelDispatch: publicProcedure
    .input(updateSalesControlSchema)
    .mutation(async (props) => {
      return cancelDispatchTask(props.ctx.db, props.input);
    }),
  startDispatch: publicProcedure
    .input(updateSalesControlSchema)
    .mutation(async (props) => {
      return startDispatchTask(props.ctx.db, props.input);
    }),
  submitDispatch: publicProcedure
    .input(updateSalesControlSchema)
    .mutation(async (props) => {
      return submitDispatchTask(props.ctx.db, props.input);
    }),
  updateSalesDeliveryOption: publicProcedure
    .input(updateSalesDeliveryOptionSchema)
    .mutation(async (props) => {
      return updateSalesDeliveryOption(props.ctx, props.input);
    }),
  salesDeliveryInfo: publicProcedure
    .input(
      z.object({
        salesId: z.number().nullable().optional(),
      })
    )
    .query(async (props) => {
      return getSalesDeliveryInfo(props.ctx, props.input.salesId);
    }),
  orderDispatchOverview: publicProcedure
    .input(salesDispatchOverviewSchema)
    .query(async (props) => {
      return getSalesDispatchOverview(props.ctx.db, {
        salesId: props.input.salesId,
        salesNo: props.input.salesNo,
      });
    }),
  dispatchOverview: publicProcedure
    .input(salesDispatchOverviewSchema)
    .query(async (props) => {
      return getDispatchOverview(props.ctx, props.input);
    }),
});
