import {
  assignWorkOrder,
  assignWorkOrderSchema,
  deleteWorkOrder,
  deleteWorkOrderSchema,
  getCustomerServices,
  getCustomerServicesSchema,
  updateWorkOrderStatus,
  updateWorkOrderStatusSchema,
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
  deleteWorkOrder: publicProcedure
    .input(deleteWorkOrderSchema)
    .mutation(async (props) => {
      return deleteWorkOrder(props.ctx, props.input);
    }),
  updateWorkOrderStatus: publicProcedure
    .input(updateWorkOrderStatusSchema)
    .mutation(async (props) => {
      return updateWorkOrderStatus(props.ctx, props.input);
    }),
});
