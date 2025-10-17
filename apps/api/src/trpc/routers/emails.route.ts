import { getSalesEmailMeta } from "@api/db/queries/email";
import { createTRPCRouter, publicProcedure } from "../init";
import { globalSearchQuery } from "@api/db/queries/search";
import { globalSearchSchema } from "@api/schemas/search";
import { salesQueryParamsSchema } from "@api/schemas/sales";

export const emailsRoute = createTRPCRouter({
  getSalesEmailMeta: publicProcedure
    .input(salesQueryParamsSchema)
    .query(async (props) => {
      return getSalesEmailMeta(props.ctx, props.input);
    }),
});
