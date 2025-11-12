import {
  getCustomerServices,
  getCustomerServicesSchema,
} from "@api/db/queries/customer-service";
import { createTRPCRouter, publicProcedure } from "../init";

export const customerServiceRouter = createTRPCRouter({
  getCustomerServices: publicProcedure
    .input(getCustomerServicesSchema)
    .query(async ({ ctx, input }) => {
      return await getCustomerServices(ctx, input);
    }),
});
