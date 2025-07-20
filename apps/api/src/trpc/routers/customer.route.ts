import { createTRPCRouter, publicProcedure } from "../init";
import { searchCustomersSchema } from "@api/schemas/customer";
import { searchCustomers } from "@api/db/queries/customer";

export const customerRouter = createTRPCRouter({
  searchCustomers: publicProcedure
    .input(searchCustomersSchema)
    .query(async (props) => {
      return searchCustomers(props.ctx, props.input);
    }),
});
