import {
  assignWorkOrder,
  assignWorkOrderSchema,
  getCustomerServices,
  getCustomerServicesSchema,
} from "@api/db/queries/customer-service";
import { createTRPCRouter, publicProcedure } from "../init";

export const customerServiceRouter = createTRPCRouter({
  assignWorkOrder: publicProcedure
    .input(assignWorkOrderSchema)
    .mutation(async (props) => {
      return assignWorkOrder(props.ctx, props.input);
    }),
  getCustomerServices: publicProcedure
    .input(getCustomerServicesSchema)
    .query(async ({ ctx, input }) => {
      return await getCustomerServices(ctx, input);
    }),
});
