import { createTRPCRouter, protectedProcedure } from "../init";
import {
  bootstrapNewSalesForm,
  deleteNewSalesFormLineItem,
  getNewSalesForm,
  recalculateNewSalesForm,
  saveDraftNewSalesForm,
  saveFinalNewSalesForm,
  searchNewSalesCustomers,
} from "@api/db/queries/new-sales-form";
import {
  bootstrapNewSalesFormSchema,
  deleteNewSalesFormLineItemSchema,
  getNewSalesFormSchema,
  recalculateNewSalesFormSchema,
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
  searchCustomers: protectedProcedure
    .input(searchNewSalesCustomersSchema)
    .query(async (props) => {
      return searchNewSalesCustomers(props.ctx, props.input);
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

