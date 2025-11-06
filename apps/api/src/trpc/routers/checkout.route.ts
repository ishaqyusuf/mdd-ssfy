import {
  createSalesCheckoutLink,
  createSalesCheckoutLinkSchema,
  initializeCheckout,
  initializeCheckoutSchema,
  verifyPayment,
  verifyPaymentSchema,
} from "@api/db/queries/checkout";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

export const checkoutRouter = createTRPCRouter({
  initializeCheckout: publicProcedure
    .input(initializeCheckoutSchema)
    .query(async (props) => {
      return initializeCheckout(props.ctx, props.input);
    }),
  createSalesCheckoutLink: publicProcedure
    .input(createSalesCheckoutLinkSchema)
    .mutation(async (props) => {
      return createSalesCheckoutLink(props.ctx, props.input);
    }),
  verifyPayment: publicProcedure
    .input(verifyPaymentSchema)
    .query(async (props) => {
      return verifyPayment(props.ctx, props.input);
    }),
});
