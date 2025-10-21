import {
  initializeCheckout,
  initializeCheckoutSchema,
} from "@api/db/queries/checkout";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

export const checkoutRouter = createTRPCRouter({
  initializeCheckout: publicProcedure
    .input(initializeCheckoutSchema)
    .query(async (props) => {
      return initializeCheckout(props.ctx, props.input);
    }),
});
