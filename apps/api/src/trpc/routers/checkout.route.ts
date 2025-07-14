import { createTRPCRouter, publicProcedure } from "../init";
import { getCheckoutSchema } from "@api/schemas/checkout";
import { getCheckout } from "@api/db/queries/checkout";

export const checkoutRouters = createTRPCRouter({
  get: publicProcedure.input(getCheckoutSchema).query(async (q) => {
    return await getCheckout(q.ctx.db, q.input);
  }),
});
