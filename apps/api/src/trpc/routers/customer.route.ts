import { createTRPCRouter, publicProcedure } from "../init";
import { searchCustomersSchema } from "@api/schemas/customer";
import {
  customerInfoSearch,
  customerInfoSearchSchema,
  getCustomerPayPortal,
  getCustomerPayPortalSchema,
  getSalesCustomer,
  getSalesCustomerSchema,
  searchCustomers,
} from "@api/db/queries/customer";
import type { CustomerProfileMeta } from "@sales/types";

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
  getCustomerPayPortal: publicProcedure
    .input(getCustomerPayPortalSchema)
    .query(async (props) => {
      return getCustomerPayPortal(props.ctx, props.input);
    }),
  getTaxProfiles: publicProcedure.query(async (props) => {
    const taxProfiles = await props.ctx.db.taxes.findMany({
      select: {
        taxCode: true,
        title: true,
      },
    });
    return taxProfiles;
  }),
  getCustromerProfiles: publicProcedure.query(async (props) => {
    const customerProfiles = await props.ctx.db.customerTypes.findMany({
      select: {
        id: true,
        title: true,
        coefficient: true,
        meta: true,
      },
    });
    return customerProfiles.map((cp) => {
      ({
        ...cp,
        meta: cp.meta as CustomerProfileMeta,
      });
    });
  }),
});
