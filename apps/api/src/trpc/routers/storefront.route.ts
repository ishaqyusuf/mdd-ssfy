import { createTRPCRouter, publicProcedure } from "../init";
import {
  productSearch,
  searchFilters,
  productSearchSchema,
  productOverviewSchema,
  productOverview,
} from "@sales/storefront";

export const storefrontRouter = createTRPCRouter({
  search: publicProcedure.input(productSearchSchema).query(async (props) => {
    const result = await productSearch(props.ctx.db, props.input);
    return result;
  }),
  searchFilters: publicProcedure
    .input(productSearchSchema)
    .query(async (props) => {
      const result = await searchFilters(props.ctx.db, props.input);
      return result;
    }),
  productOverview: publicProcedure
    .input(productOverviewSchema)
    .query(async (props) => {
      const result = await productOverview(props.ctx.db, props.input);
      return result;
    }),
});
