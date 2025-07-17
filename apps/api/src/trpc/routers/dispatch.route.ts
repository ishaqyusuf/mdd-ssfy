import { createTRPCRouter, publicProcedure } from "../init";
import {
  dispatchQueryParamsSchema,
  updateSalesDeliveryOptionSchema,
} from "@api/schemas/dispatch";
import {
  getDispatches,
  getSalesDeliveryInfo,
  updateSalesDeliveryOption,
} from "@api/db/queries/dispatch";
import { z } from "zod";

export const dispatchRouters = createTRPCRouter({
  index: publicProcedure
    .input(dispatchQueryParamsSchema)
    .query(async (props) => {
      return getDispatches(props.ctx, props.input);
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
      }),
    )
    .query(async (props) => {
      return getSalesDeliveryInfo(props.ctx, props.input.salesId);
    }),
});
