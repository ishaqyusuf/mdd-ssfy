import { createTRPCRouter, protectedProcedure } from "../init";
import {
  bootstrapNewSalesForm,
  deleteNewSalesFormLineItem,
  getNewSalesForm,
  getNewSalesFormShelfCategories,
  getNewSalesFormShelfProducts,
  getNewSalesFormStepRouting,
  recalculateNewSalesForm,
  resolveNewSalesCustomer,
  saveDraftNewSalesForm,
  saveFinalNewSalesForm,
  searchNewSalesCustomers,
} from "@api/db/queries/new-sales-form";
import {
  bootstrapNewSalesFormSchema,
  deleteNewSalesFormLineItemSchema,
  getNewSalesFormSchema,
  getNewSalesFormStepRoutingSchema,
  getNewSalesFormShelfCategoriesSchema,
  getNewSalesFormShelfProductsSchema,
  recalculateNewSalesFormSchema,
  resolveNewSalesCustomerSchema,
  saveDraftNewSalesFormSchema,
  saveFinalNewSalesFormSchema,
  searchNewSalesCustomersSchema,
} from "@api/schemas/new-sales-form";

export const newSalesFormRouter = createTRPCRouter({
  bootstrap: protectedProcedure
    .input(bootstrapNewSalesFormSchema)
    .query(async (props) => {
      return bootstrapNewSalesForm(props.ctx, props.input);
    }),
  get: protectedProcedure.input(getNewSalesFormSchema).query(async (props) => {
    return getNewSalesForm(props.ctx, props.input);
  }),
  getStepRouting: protectedProcedure
    .input(getNewSalesFormStepRoutingSchema)
    .query(async (props) => {
      return getNewSalesFormStepRouting(props.ctx, props.input);
    }),
  getShelfCategories: protectedProcedure
    .input(getNewSalesFormShelfCategoriesSchema)
    .query(async (props) => {
      return getNewSalesFormShelfCategories(props.ctx, props.input);
    }),
  getShelfProducts: protectedProcedure
    .input(getNewSalesFormShelfProductsSchema)
    .query(async (props) => {
      return getNewSalesFormShelfProducts(props.ctx, props.input);
    }),
  searchCustomers: protectedProcedure
    .input(searchNewSalesCustomersSchema)
    .query(async (props) => {
      return searchNewSalesCustomers(props.ctx, props.input);
    }),
  resolveCustomer: protectedProcedure
    .input(resolveNewSalesCustomerSchema)
    .query(async (props) => {
      return resolveNewSalesCustomer(props.ctx, props.input);
    }),
  recalculate: protectedProcedure
    .input(recalculateNewSalesFormSchema)
    .mutation(async (props) => {
      return recalculateNewSalesForm(props.ctx, props.input);
    }),
  saveDraft: protectedProcedure
    .input(saveDraftNewSalesFormSchema)
    .mutation(async (props) => {
      return saveDraftNewSalesForm(props.ctx, props.input);
    }),
  saveFinal: protectedProcedure
    .input(saveFinalNewSalesFormSchema)
    .mutation(async (props) => {
      return saveFinalNewSalesForm(props.ctx, props.input);
    }),
  deleteLineItem: protectedProcedure
    .input(deleteNewSalesFormLineItemSchema)
    .mutation(async (props) => {
      return deleteNewSalesFormLineItem(props.ctx, props.input);
    }),
});
