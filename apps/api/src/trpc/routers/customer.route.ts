import { createTRPCRouter, publicProcedure } from "../init";
import {
  getCustomerDirectoryV2SummarySchema,
  getCustomerOverviewV2Schema,
  searchCustomersSchema,
  upsertCustomerSchema,
} from "@api/schemas/customer";
import {
  createOrUpdateCustomer,
  createOrUpdateCustomerAddress,
  customerInfoSearch,
  customerInfoSearchSchema,
  getCustomerDirectoryV2Summary,
  getCustomerPayPortal,
  getCustomerPayPortalSchema,
  getCustomerOverviewV2,
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
  getCustomerDirectoryV2Summary: publicProcedure
    .input(getCustomerDirectoryV2SummarySchema)
    .query(async (props) => {
      return getCustomerDirectoryV2Summary(props.ctx, props.input);
    }),
  getCustomerOverviewV2: publicProcedure
    .input(getCustomerOverviewV2Schema)
    .query(async (props) => {
      return getCustomerOverviewV2(props.ctx, props.input);
    }),
  getTaxProfiles: publicProcedure.query(async (props) => {
    const taxProfiles = await props.ctx.db.taxes.findMany({
      select: {
        taxCode: true,
        title: true,
        percentage: true,
      },
    });
    return taxProfiles;
  }),
  getCustomerProfiles: publicProcedure.query(async (props) => {
    const customerProfiles = await props.ctx.db.customerTypes.findMany({
      select: {
        id: true,
        title: true,
        coefficient: true,
        meta: true,
      },
    });
    return customerProfiles.map((cp) => ({
      ...cp,
      meta: cp.meta as CustomerProfileMeta,
    }));
  }),
  createCustomer: publicProcedure
    .input(upsertCustomerSchema)
    .mutation(async (props) => {
      return createOrUpdateCustomer(props.ctx, props.input);
    }),
  createCustomerAddress: publicProcedure
    .input(upsertCustomerSchema)
    .mutation(async (props) => {
      return createOrUpdateCustomerAddress(props.ctx, props.input);
    }),
});
