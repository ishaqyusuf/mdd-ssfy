import { getDealerPortalDashboard } from "@gnd/db/queries";
import { createTRPCRouter, dealerProtectedProcedure } from "../init";

export const dealerPortalRouter = createTRPCRouter({
  me: dealerProtectedProcedure.query(({ ctx }) => {
    return ctx.dealer;
  }),
  dashboard: dealerProtectedProcedure.query(({ ctx }) => {
    return getDealerPortalDashboard(ctx.db, ctx.dealer.id);
  }),
});
