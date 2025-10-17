import { createTRPCRouter, publicProcedure } from "../init";
import { globalSearchQuery } from "@api/db/queries/search";
import { globalSearchSchema } from "@api/schemas/search";

export const searchRouter = createTRPCRouter({
  global: publicProcedure.input(globalSearchSchema).query(async (props) => {
    return globalSearchQuery(props.ctx, props.input);
  }),
});
