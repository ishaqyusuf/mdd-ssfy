import { createTRPCRouter, publicProcedure } from "../init";
import { searchCustomersSchema } from "@api/schemas/customer";
import {
  customerInfoSearch,
  customerInfoSearchSchema,
  getSalesCustomer,
  getSalesCustomerSchema,
  searchCustomers,
} from "@api/db/queries/customer";

export const customerRouter = createTRPCRouter({
  searchCustomers: publicProcedure
    .input(searchCustomersSchema)
    .query(async (props) => {
      return searchCustomers(props.ctx, props.input);
    }),
  customerInfoSearch: publicProcedure
    .input(customerInfoSearchSchema)
    .query(async (props) => {
      const result = await customerInfoSearch(props.ctx, props.input);
      return result;
    }),
  getSalesCustomer: publicProcedure
    .input(getSalesCustomerSchema)
    .query(async (props) => {
      return getSalesCustomer(props.ctx, props.input);
    }),
});
